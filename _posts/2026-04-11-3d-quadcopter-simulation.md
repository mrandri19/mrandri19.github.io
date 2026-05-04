---
layout: post
title: "Simulating a 3D quadcopter from scratch"
---

<link rel="stylesheet" href="/assets/katex/katex.min.css">
<script defer src="/assets/katex/katex.min.js"></script>
<script
    defer
    src="/assets/katex/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body);"
>
</script>

<!--
-   FBD
    -   differences between world and body frame and why we choose which
    -   quaternions
-   newton-euler equations of motion
    -   deriving equations of motion
-   choosing how to go to state space
    -   euler angles vs body rates / angular velocities, quaternion vs body rates
    -   quaternion derivatives
-   choosing our inputs and how mixer transates from input to forces
-   Python implementation
-   viz, it works!
-   bonus, visualization via rerun.io
-   bonus, rust implementation (next post I say)
-->

Our series on quadcopter simulation and control continues with this post, which explains how to model a 3D quadcopter.
We will derive the equations of motion, introduce quaternions and quaternion derivatives, transform them the state-space form, and finally simulate the system in Python.

This post will be longer and more technical than the previous post, which covers the 2D case.
As it turns out, the problem becomes more complicated in 3D and requires more advanced parts of math.

<!-- FBD axes, world (inertial) and body (non-intertial) frames -->
The free-body diagram for the quadcopter is shown below.
We use a right-hand coordinate frame with the $$z$$ axis for altitude.
The axes $$\{x, y, z\}$$ are constant over time and form the world frame.
This frame of reference doesn't accelerate and it's inertial.
The axes $$\{x', y', z'\}$$ instead are always located at the quadcopter center of mass and form the body frame, which changes over time.
The body frame is not an inertial frame of reference, as the drone accelerates.
Some equations of motion are easier to write in the world frame while others in the body frame.
Our model uses both.

<!-- FBD body, forces, and torques. Position and attitude. -->
The quadcopter is made of four rods of length $$\ell$$ laid in a "+" pattern around the center $$C$$.
There is a spinning propeller the end of each rod, which generates thrust $$F_i$$ and, because of the propeller drag, a torque $$\tau_{i} = F_i / k$$ opposite to the propeller spin direction.
The quadcopter can have arbitrary position and attitude (i.e. its orientation).
Let $$\mathbf{p}$$ be the position vector from origin $$O$$ to center of mass $$C$$.
Let $$q$$ be the quaternion that rotates a vector’s coordinates from the body frame to the world frame, representing the attitude.

<figure>
    <img src="/assets/images/3d-quadcopter-simulation/free-body-diagram.png"
    style="max-width: 70%; display: block; margin: auto;"/>
</figure>

<!-- Aside: what are quaternions, where to learn about them, why we use them -->
Let's briefly talk about quaternions, as I expect most people to not be familiar with them.
Quaternions, unit quaternions to be precise, are a way to represent rotations.
Rotations, especially in 3D, are strange obects as they don't live in the usual $$\mathbb{R}^3$$ like position or velocity vectors.
Instead, rotations live in a space called the 3D special orthogonal group, or $$\text{SO}(3)$$.
Representing $$\text{SO}(3)$$ objects in $$\mathbb{R}^3$$ is possible, for example using Euler angles, but leads to issues like singularities and numerical instability.
For our purposes, representing attitude with quaternions leads to simpler, more efficient, and more numerically stable code.
To find out more, my favourite resource is [this video by Freya Holmer](https://www.youtube.com/watch?v=PMvIWws8WEo) paired with your favourite LLM for clarifications.
We'll talk more about quaternions, specifically about their derivatives, later in the post.

<!-- Introducing Newton-Euler equations of motion -->
Having introduced our free body diagram, let's write the Newton-Euler rigid body equations of motion.
In 2D we could work with three scalar equations, two for position ($$y, z$$ axes) and one for rotation.
In 3D instead we have a system of six equations: three for translation (in world frame), three for rotation (in body frame), written in vector form.
$$\mathbf{\dot{v}}$$ is the time derivative of velocity, itself the derivative of position $$\mathbf{p}$$.
$$\dot{\omega}$$ is the time derivative of angular velocity, which is NOT the derivative of attitude (the two are connected via the kinematic matrix).
Finally, $$m$$ is the mass and $$I$$ is the moment of inertia.

$$
\begin{aligned}

m \mathbf{\dot{v}} &= \sum_i \mathbf{F_i} && \text{(world frame)} \\
I \dot{\omega} + \omega \times I \omega &= \sum_i \mathbf{\tau_i} && \text{(body frame)}

\end{aligned}
$$

<!-- Deriving equations of motion: translation -->
Let's now plug in the forces from the free-body diagram into the translation equations.
In world frame where the axes are $$\{x, y, z\}$$, our quadcopter is subject to the gravitational force $$-m\mathbf{g}$$ where $$\mathbf{g} = \left[0, 0, g\right]^T_{\text{world}}$$.
Additionally, each motor produces thrust $$\mathbf{F_i}$$ of magnitude $$F_i$$, but this vector is only easy to write in body frame, where the motors always point straight up, or $$\mathbf{F_i} = \left[0, 0, F_i\right]^T_{\text{body}}$$.
To convert our simple expression for thrusts from body frame into world frame, we must rotate them.
To rotate the body frame vector to world frame we use the attitude quaternion $$q$$.

<!-- Deriving equations of motion: rotation -->
We derive rotation equations (in body frame) from the free-body diagram by seeing how each force or torque influences each rotation axis.
If the second motor speeds up, increasing $$F_2$$, angle $$\phi$$ (roll) will increase.
If the fourth motor speeds up, $$F_4$$ increases and $$\phi$$ decreases.
Thus the force couple $$(F_2 - F_4)$$, multiplied by arm length $$\ell$$ will form the torque on the $$x'$$ axis.
The same argument holds for $$F_1, F_3$$ and $$\theta$$ (pitch) on the $$y'$$ axis.
Finally, for $$\psi$$ (yaw) on the $$z'$$ axis, we simply add together all propeller drag torques $$\tau_i$$.

$$
\begin{aligned}

m \mathbf{\dot{v}} &= -m\mathbf{g} + \text{rotate}(q, \mathbf{F_1} + \mathbf{F_2} + \mathbf{F_3} + \mathbf{F_4}) \\

I \dot{\omega} + \omega \times I \omega &=
\begin{bmatrix}
    \ell (F_2 - F_4) \\
    \ell (F_3 - F_1) \\
    \mathbf{\tau_1} - \mathbf{\tau_2} + \mathbf{\tau_3} - \mathbf{\tau_4}
\end{bmatrix}

\end{aligned}
$$

<!-- Equations of motion to state-space representation: re-arranging -->
Let's now start re-arranging the equations so that we can write our system in
state-space form.
First, let's define mass-normalized thrust as $$\mathbf{c} = \frac{1}{m} (\mathbf{F_1} + \mathbf{F_2} + \mathbf{F_3} + \mathbf{F_4})$$.
Then let $$\Tau$$ be the vector of torques defined above.
With this, we can move all terms to the right-hand side to only have derivatives of (linear) velocity and angular velocity on the left-hand side.

$$
\begin{aligned}

\mathbf{\dot{v}} &= -\mathbf{g} + \text{rotate}(q, \mathbf{c}) \\
\dot{\omega} &= I^{-1} (\Tau - \omega \times I \omega)

\end{aligned}
$$

<!-- State-space representation: input and state parametrization -->

Our goal is to express how the system evolves over time in the form:

$$
\mathbf{\dot{x}} = f(\mathbf{x}, \mathbf{u})
$$

In our case, our input is simply the motor forces $$\mathbf{u} = \left[ \mathbf{F_1}, \mathbf{F_2}, \mathbf{F_3}, \mathbf{F_4} \right]^T$$.
Parametrizing the state is more complicated: we want a first-order system, so we include velocities $$\mathbf{v}$$ and $$\omega$$ in the state.
<!-- euler angles vs body rates / angular velocities, quaternion vs body rates -->
But what should our zeroth-order quantities be?
For translations, it's easy, we will use position $$\mathbf{p}$$ whose derivative is the velocity.
For rotations, it turns out that the best parametrization is the quaternion $$q$$.
This results in a 13-dimensional (3 + 4 + 3 + 3) state:

$$
\mathbf{x} = \left[\mathbf{p}, q, \mathbf{v}, \omega \right]^T
$$

Which we use to write our system as:

$$
\mathbf{\dot{x}} =

\begin{bmatrix}
    \mathbf{\dot{p}} \\
    \dot{q} \\
    \mathbf{\dot{v}} \\
    \dot{\omega}
\end{bmatrix} =

f(\mathbf{x}, \mathbf{u}) =

\begin{bmatrix}
    \mathbf{v} \\
    ? \\
    -\mathbf{g} + \text{rotate}(q, \mathbf{c}) \\
    I^{-1} (\Tau - \omega \times I \omega)
\end{bmatrix}
$$

<!-- quaternion derivatives -->
But what's the derivative of a quaternion?
Answering this question rigorously requires mathematics beyond my comfort level.
But below is my attempt at a proof of the formula we will use.
The proof comes from [Quaternion differentiation](https://fgiesen.wordpress.com/2012/08/24/quaternion-differentiation), adapted to this post's notation.

Let $$q(0) = q$$ be our attitude quaternion at time $$t=0$$.
We denote quaternion multiplication between quatenions $$q_a$$ and $$q_b$$ with $$q_a \otimes q_b$$.
Our quadcopter rotates by $$ \omega \cdot 1$$ in one unit of time.
Let $$q_{\omega}$$ be the quaternion representing the rotation.
This means that at time $$t = 1$$, we have $$q(1) = q \otimes q_{\omega}$$.
And, by induction, $$q(t) = q \otimes q_{\omega}^t$$ at time $$t$$.

Any unit quaternion can be represented as the exponential of a pure imaginary quaternion, just like any complex number $$z$$ can be written as the exponential of a pure imaginary number $$i\theta$$ or $$z = e^{i\theta}$$.
We call $$\omega^{\wedge}$$ the pure imaginary quaternion (a 4D quantity) created from the 3D angular velocity $$\omega$$ or $$\omega^{\wedge} = \left(0, \omega_1, \omega_2, \omega_3 \right)$$.
This lets us write $$q_{\omega} = e^{\frac{1}{2} \omega^{\wedge}}$$ and $$q_{\omega}^t = e^{\frac{1}{2} \omega^{\wedge} t}$$.
The additional factor $$\frac{1}{2}$$ is a result of how quaternions are a "double cover" of rotations, an artifact of the particular representation of $$\text{SO}(3)$$ we picked.

Putting everything together:

$$q(t) = q \otimes e^{\frac{1}{2} \omega^{\wedge} t}$$

and differentiating:

$$
\begin{aligned}

\dot{q(t)} &= q \otimes e^{\frac{1}{2} \omega^{\wedge} t} \otimes \frac{1}{2} \omega^{\wedge} \\

\dot{q(t)} &= q(t) \otimes \frac{1}{2} \omega^{\wedge}

\end{aligned}
$$

That's it! We've made it through the proof, and can finally write the state-space formulation of our system:

$$
\mathbf{\dot{x}} =

\begin{bmatrix}
    \mathbf{\dot{p}} \\
    \dot{q} \\
    \mathbf{\dot{v}} \\
    \dot{\omega}
\end{bmatrix} =

f(\mathbf{x}, \mathbf{u}) =

\begin{bmatrix}
    \mathbf{v} \\
    q \otimes \frac{1}{2} \omega^{\wedge} \\
    -\mathbf{g} + \text{rotate}(q, \mathbf{c}) \\
    I^{-1} (\Tau - \omega \times I \omega)
\end{bmatrix}
$$

<!-- choosing our inputs and how mixer transates from input to forces -->
The last bit we need to handle is how to parametrize our inputs $$u$$ and how they translate into our forces $$F_i$$.
This choice is a bit arbitrary, but following [Deep Drone Acrobatics](https://arxiv.org/abs/2006.05768) and [Champion-level drone racing using deep reinforcement learning](https://www.nature.com/articles/s41586-023-06419-4) we use mass-normalized thrust and angular velocities.
We call the inputs $$u_c$$ for mass-normalized thrust and $$u_p, u_q, u_r$$ for angular velocities.
The function mapping inputs to forces is called "mixer".
For more details on how to extend this to more shapes and propellers check out [Motor Mixer Theory](https://cookierobotics.com/066/).
These equations can be derived with a simple (but easy to get wrong) geometric argument from the free body diagram.

Let $$F_t = \frac{u_c m}{4} $$, and remembering that $$k$$ is the propeller-drag ratio, then our mixer is:

$$
\begin{aligned}

\begin{bmatrix}
F_1 \\
F_2 \\
F_3 \\
F_4
\end{bmatrix}

= \text{mixer}\left(
\begin{bmatrix}
u_c \\
u_p \\
u_q \\
u_r
\end{bmatrix}
\right) =

\begin{bmatrix}
F_t - u_q / 2L + k u_r / 4 \\
F_t + u_p / 2L - k u_r / 4 \\
F_t + u_q / 2L + k u_r / 4 \\
F_t - u_p / 2L - k u_r / 4
\end{bmatrix}

\end{aligned}
$$

<!-- Python implementation -->
## Simulating the system in Python

We can now simulate the system in Python.
First, we define the physical parameters, the dynamics function, and the mixer function:

```python
g = 9.81  # [m/s*s] gravity
m = 0.8  # [kg] mass
L = 0.5  # [m] arm length
k = 100  # [] thrust / drag ratio.
I = np.diag([0.001, 0.001, 0.002])  # noqa: E741  # inertia matrix.
I_inv = np.linalg.inv(I)


def dynamics(x: NDArray, u: NDArray) -> NDArray:
    F1, F2, F3, F4 = mixer(u)

    q, v, omega = x[3:7], x[7:10], x[10:13]
    c = np.array([0, 0, (F1 + F2 + F3 + F4) / m])
    tau1, tau2, tau3, tau4 = F1 / k, F2 / k, F3 / k, F4 / k
    Tau = np.array([L * (F2 - F4), L * (F3 - F1), tau1 - tau2 + tau3 - tau4])

    return np.concat(
        [
            v,
            0.5 * quat_mul(q, np.array([0, *omega])),
            np.array([0, 0, -g]) + rot_vec_by_quat(q, c),
            I_inv @ (Tau - np.cross(omega, I @ omega)),
        ]
    )

def mixer(u: NDArray) -> NDArray:
    u_c, u_p, u_q, u_r = u
    F_t = u_c * m / 4
    F1 = F_t - u_q / (2 * L) + k * u_r / 4
    F2 = F_t + u_p / (2 * L) - k * u_r / 4
    F3 = F_t + u_q / (2 * L) + k * u_r / 4
    F4 = F_t - u_p / (2 * L) - k * u_r / 4
    return np.array([F1, F2, F3, F4])
```

With the dynamics (and mixer) defined, we use Euler's method to solve the first-order ordinary differential equations.
We initialize the quadcopter two meters above the origin at $$\mathbf{p}=(0, 0, 2)$$.
A "zero" rotation is an unit quaternion $$(1, 0, 0, 0)$$.
We set the mass-normalized thrust $$u_c$$ to be just above $$g$$, to make the quadcopter go up.
We set the input yaw rate $$u_r$$ to a function that: goes to 1, stays at 1 for 1 second, goes to zero, stays at zero for 1 second, goes to -1 and stays there for 1 more second, then finally goes to 0.

```python
t_start = 0.0
t_stop = 10.0
n_steps = 10_000
t = np.linspace(t_start, t_stop, n_steps)
dt = t[1] - t[0]

d_state = 13  # 13 = 3 (position) + 4 (attitude quaternion) + 3 (speed) + 3 (body rate).
x = np.zeros((n_steps, d_state))
x[0, 2] = 2  # start at z=2
x[0, 3:7] = np.array([1, 0, 0, 0])  # setup quaternion to have unit length.

d_input = 4
u = np.zeros((n_steps, d_input))
u[:, 0] = 9.81 + 0.05
u[:, 3] = 1e-3 * (
    np.heaviside(t - 1, 1)
    - np.heaviside(t - 2, 1)
    - np.heaviside(t - 3, 1)
    + np.heaviside(t - 4, 1)
)

for i in range(n_steps - 1):
    x[i + 1, :] = x[i, :] + dynamics(x[i], u[i]) * dt

    # Normalize quaternion (its norm can change due to numerical precision).
    q = x[i + 1, 3:7]
    x[i + 1, 3:7] = q / np.linalg.norm(q)
```

That is the complete simulation pipeline: derive the equations of motion, convert them to state-space form, and integrate them numerically in Python.

## Running the simulation

TODO
