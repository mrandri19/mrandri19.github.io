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
        euler angles vs body rates / angular velocities, quaternion vs body rates
-   choosing our inputs and how mixer transates from input to forces
-   implementation (in Python)
-   works!
-   bonus, visualization via rerun.io
-   bonus, rust implementation in gymnasium environment format
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
There is a spinning propeller the end of each rod, which generates thrust $$F_i$$ and, because of the propeller drag, a torque $$\tau_{i}$$ opposite to the propeller spin direction.
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

Let's now start re-arranging the equations so that we can write our system in
state-space form.
First, let's define mass-normalized thrust as $$\mathbf{c} = \frac{1}{m} (\mathbf{F_1} + \mathbf{F_2} + \mathbf{F_3} + \mathbf{F_4})$$.
Then define $$\Tau$$ as the vector of torques.
With this, we can move all terms to the right-hand side to only have derivatives of (linear) velocity and angular velocity on the left-hand side.

$$
\begin{aligned}

\mathbf{\dot{v}} &= -\mathbf{g} + \text{rotate}(q, \mathbf{c}) \\
\dot{\omega} &= I^{-1} (\Tau - \omega \times I \omega)

\end{aligned}
$$

TODO

## Sources
-   [Deep Drone Acrobatics](https://arxiv.org/abs/2006.05768)
-   [Champion-level drone racing using deep reinforcement learning](https://www.nature.com/articles/s41586-023-06419-4)
-   [Quaternion differentiation](https://fgiesen.wordpress.com/2012/08/24/quaternion-differentiation)
