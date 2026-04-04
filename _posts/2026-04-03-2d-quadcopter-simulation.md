---
layout: post
title: "Simulating a 2D quadcopter"
---

<link rel="stylesheet" href="/assets/katex/katex.min.css">
<script defer src="/assets/katex/katex.min.js"></script>
<script
    defer
    src="/assets/katex/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body);"
>
</script>

<!-- Introduction -->
In this blog post we describe how to simulate a 2D (planar) quadcopter.
We will derive the quadcopter dynamics, rewrite them into a state-space dynamic system, and simulate it in Python.

<!-- FBD axes -->
Let's begin by drawing the free-body diagram (in the figure below).
We choose $$y$$ as our horizontal axis and $$z$$ as our vertical axis.
This will be useful when extending our model to simulate a 3D quadcopter.
By the right-hand rule, this means that the $$x$$ axis is pointing towards us.

<!-- FBD body and forces -->
The quadcopter body is a point-mass at $$C$$ of mass $$m$$ with two arms of length $$\ell$$.
The body can rotate in the $$yz$$ plan with an angle $$\phi$$.
Gravity pulls the quadcopter downward with magnitude $$mg$$.
At each arm, we have a propeller generating thrusts $$F_1$$ and $$F_2$$, perpendicular to the length of the quadcopter.

<figure>
    <img src="/assets/images/2d-quadcopter-simulation/free-body-diagram.svg"
    style="max-width: 50%; display: block; margin: auto;"/>
</figure>

<!-- FBD to equations of motion, notation -->
With the free-body diagram, we can derive the equations of motion.
We start with the Netwon-Euler rigid body equations: two motion equations for $$x$$ and $$y$$, one rotation equation for $$\phi$$.
Here, $$F_x$$ and $$F_y$$ are components of the forces along the respective axes.
$$\tau$$ and $$I$$ are the torques and moment of inertia about the center of mass.
We denote the second derivative w.r.t. time with the double dot syntax.

$$
\begin{aligned}

m \ddot{y} &= \sum F_y \\
m \ddot{z} &= \sum F_z \\
I \ddot{\phi} &= \sum \tau

\end{aligned}
$$

With some trigonometry we find the equations of motion:

$$
\begin{aligned}

m \ddot{y} &= - (F_1 + F_2) \sin \phi \\
m \ddot{z} &= (F_1 + F_2) \cos \phi - m g \\
I \ddot{\phi} &= (F_1 - F_2) \ell

\end{aligned}
$$

<!-- Equations of motion to state-space representation -->
To easily simulate our dynamical system, we want to convert our equations of motion into a state-space representation.
In a state-space representation, we must define the state $$\mathbf{x}$$, the minimal set of variables to describe our system.
Additionally, we must define our inputs $$\mathbf{u}$$, the variables we can control.
The final equation we are looking for has the form:

$$
\mathbf{\dot{x}} = f(\mathbf{x}, \mathbf{u})
$$

<!-- Definition of input -->
We control the thrusts $$F_1, F_2$$ produced by each propeller in the quadcopter.
We define our inputs as $$\mathbf{u} = \left[ (F_1 + F_2), (F_1 - F_2) \right]^T$$, as it leads to a cleaner formulation.

<!-- Equations of motion only derivative on the left -->
To get closer to state-space representation, let's rewrite the equations of motion to only have derivatives on the left side, and use our inputs:

$$
\begin{aligned}

\ddot{y} &= - \frac{u_1}{m} \sin \phi \\
\ddot{z} &= \frac{u_1}{m} \cos \phi - g \\
\ddot{\phi} &= \frac{u_2}{I} \ell

\end{aligned}
$$

<!-- Reduction to first-order form and final state-space system -->
To reduce our second-order system to a first-order one, we introduce these state variables:

$$
\mathbf{x} = \left[ y, z, \phi, \dot{y}, \dot{z}, \dot{\phi} \right]^T
$$

By have first-order derivatives as state variables, we can write the state-space representation:

$$
\mathbf{\dot{x}} =

\begin{bmatrix}
    \dot{y} \\
    \dot{z} \\
    \dot{\phi} \\
    \ddot{y} \\
    \ddot{z} \\
    \ddot{\phi}
\end{bmatrix} =

f(\mathbf{x}, \mathbf{u}) =

\begin{bmatrix}
    \dot{y} \\
    \dot{z} \\
    \dot{\phi} \\
    - \frac{u_1}{m} \sin \phi \\
    \frac{u_1}{m} \cos \phi - g \\
    \frac{u_2}{I} \ell
\end{bmatrix}
$$


<!-- Python simulation -->
To simulate the system in state-space representation, we start by defining our
physical parameters and our dynamics:

<!-- TODO: get better syntax highlighting -->
```python
import numpy as np
from numpy.typing import NDArray

m = 0.8  # [kg]
g = 9.81  # [m/s*s]
l = 0.5  # [m]
I = 1e-3  # [kg*m*m]


def dynamics(x: NDArray, u: NDArray) -> NDArray:
    _y, _z, phi, y_dot, z_dot, phi_dot = x
    return np.array(
        [
            y_dot,
            z_dot,
            phi_dot,
            -u[0] / m * np.sin(phi),
            u[0] / m * np.cos(phi) - g,
            u[1] / I * l,
        ]
    )
```

With the dynamics defined, we solve the first-order ordinary differential equation with Euler's method.
We set our first input $$u_1 = F_1 + F_2 = m g + 0.01$$ in order to avoid falling and slowly ascend.
We leave the second input $$u_2 = 0$$ as we don't want the quadcopter to flip.

```python
t_start, t_stop, n_steps = 0.0, 15.0, 1_000
t = np.linspace(start=t_start, stop=t_stop, num=n_steps)
dt = (t_stop - t_start) / n_steps

d_state = 6
x = np.zeros(shape=(n_steps, d_state))

d_input = 2
u = np.zeros(shape=(n_steps, d_input))
u[:, 0] = m * g + 0.01  # Enough thrust to beat gravity plus a bit more.

for i in range(n_steps - 1):
    x[i + 1] = x[i] + dynamics(x[i], u[i]) * dt
```

And that's it. We have derived equations of motion for a 2D quadcopter, converted them into state-space, and simulated them in Python.

<details>
<summary>
Matplotlib plotting code and plots.
</summary>

{% highlight python %}
import matplotlib.pyplot as plt

fig, axes = plt.subplots(nrows=3, sharex=True, figsize=(6, 6))
axes[0].plot(t, x[:, 0], label="y")
axes[0].plot(t, x[:, 1], label="z")
axes[0].plot(t, x[:, 2], label="phi")
axes[0].set_title("q")
axes[1].plot(t, x[:, 3], label="ydot")
axes[1].plot(t, x[:, 4], label="zdot")
axes[1].plot(t, x[:, 5], label="phidot")
axes[1].set_title("q dot")
axes[2].plot(t, u[:, 0], label="u0")
axes[2].plot(t, u[:, 1], label="u1")
axes[2].set_title("u")
for ax in axes:
    ax.legend(loc="upper right")
    ax.set_xlabel("time [s]")
    ax.grid(visible=True)
fig.tight_layout()
plt.show()
{% endhighlight %}

<figure>
    <img src="/assets/images/2d-quadcopter-simulation/matplotlib-plot.png"
    style="max-width: 75%; display: block; margin: auto;"/>
</figure>

</details>
