---
layout: post
title: "A recipe for drone racing with reinforcement learning"
---

<link rel="stylesheet" href="/assets/katex/katex.min.css">
<script defer src="/assets/katex/katex.min.js"></script>
<script
    defer
    src="/assets/katex/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body);"
>
</script>

This post is the third and final post in our series on quadcopter simulation.
The [first post]({% post_url 2026-04-03-2d-quadcopter-simulation %}) and [second post]({% post_url 2026-04-11-3d-quadcopter-simulation %}) derived and simulated the quadcopter's equations of motion, first in 2D and then in 3D.
In this post we train a reinforcement learning policy to fly the quadcopter, first to hover at a fixed point, then to fly through a sequence of gates.

The previous posts were tutorial-like, we started from a free body diagram and, step-by-step, arrived to simulation code.
This post instead is more recipe-like, a collection of tricks and techniques I found useful to train an RL policy for quadcopter racing.
There is no rigorous proof of why these methods work, only empirical.
Speaking of which, demo time (viz thanks to the 🐐s at Rerun)!

<figure>
    <iframe src="https://app.rerun.io/version/0.28.2/?url=https://mrandri19.github.io/assets/images/drone-racing-with-reinforcement-learning/split_s.rrd"
    allow="local-network-access" style="width: 80vw; height: 60vh; display: block; margin-left: 50%; transform: translateX(-50%);"></iframe>
</figure>

## An incremental approach

Trying to implement a drone racing simulation, RL environment, reward, and model all at once just doesn't work.
Too many things can be slightly off, affecting the policy's performace, with no good way of debugging it.
So we split the task in three stages, each building on top of each other:

1. The "Hello, world! of RL": training a policy to solve the inverted pendulum control problem with PPO and a vectorized [stable-baselines3](https://stable-baselines3.readthedocs.io/) env.
2. Building a custom quadcopter RL environment using MuJoCo, choosing action and observation spaces, splitting high-level RL-based and low-level P-controller, and an hovering reward.
3. Extending the environment from hovering to racing, with a new reward, observation, and random initialization design.

## Solving inverted pendulum with vectorized PPO

Let's start from the basics and setup our vectorized RL problem.
We use stable-baselines3's `PPO` together with a vectorized `InvertedPendulum-v5` (cartpole) environment, and check that the policy reaches the maximum episode length.

```python
from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.policies import ActorCriticPolicy


def main() -> None:
    env = make_vec_env("InvertedPendulum-v5", n_envs=128)
    model = PPO(
        policy=ActorCriticPolicy,
        env=env,
        learning_rate=3e-3,  # 3e-4 (default lr) * sqrt(n_envs) ~= 3e-3
        n_steps=512,  # lower than default 2048, no need to have that many steps with 128 envs.
        batch_size=1024,  # higher than default 64 for better efficiency.
        n_epochs=5,  # lower than default 10, speeds up training, no need to refit 10 times
        verbose=1,
    )
    model.learn(total_timesteps=750_000)
```

Let's briefly discuss our choice of hyperparameters:

- Rollout size is `n_envs * n_steps`: with 128 environments and 512 steps each, PPO collects 65,536 transitions before every policy update.
Having this batch be large enough is crucial, as we want variety in the dataset we used to train at each PPO update.
- Number of PPO updates is `total_timesteps / rollout_size`. Given a large enough rollout size, it's then crucial that our model has enough times to "evolve" during the training process.
This is not supervised learning, where the dataset is fixed.
As the policy evolves, new patterns appear in the rollout data, so we want enough PPO updates to explore this space.
- Number of gradient steps is `total_timesteps * n_epochs / batch_size`: each rollout is split into minibatches of `batch_size` and reused for `n_epochs` passes.
Finally, the bigger the batch size, the less noisy the gradient but the fewer training iterations we do per PPO update.

### Results

On this environment, each alive step gives +1 reward, so episode length and reward will match exactly.
Training runs for 750k timesteps across 128 parallel environments, or 12 PPO updates.
Episode length grows smoothly from the first update, and the policy is near the 1,000-step cap by 600k steps.

<img src="/assets/images/drone-racing-with-reinforcement-learning/cartpole_training.svg" alt="Cartpole training curves: ep_len_mean and ep_rew_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">

## Learning to hover with a custom quadcopter environment

Now that we have shown that PPO plus our hyperparameters works on a toy task, let's develop the quadcopter environment and setup a simple hover reward.
We will use [MuJoCo](https://mujoco.readthedocs.io/en/stable/overview.html) as our physics simulator.

As said before, we won't go through all the code necessary to implement it, you can find that on GitHub at [mrandri19/quadcopter-racing](https://github.com/mrandri19/quadcopter-racing).

### Action design: CTBR + P controller

The policy does not directly output four motor commands.
Instead, it outputs a collective thrust and body rates (CTBR) command: mass-normalized thrust and desired roll, pitch, and yaw rates.
This is the action design that several papers such as [Champion-level drone racing using deep reinforcement learning](https://www.nature.com/articles/s41586-023-06419-4) or [Deep Drone Acrobats](https://arxiv.org/abs/2006.05768) use.
A low-level proportional (P) controller then converts this into individual motor commands, using the current body-frame angular velocity as feedback:

```python
def _controller(
    self, omega_body: NDArray, denormalized_actions: NDArray
) -> NDArray:
    f_des = denormalized_actions[:, 0]
    w_des = denormalized_actions[:, 1:4]
    w = omega_body

    Jw = self._J_diag * w
    u_w = self._K_p * (w_des - w) + np.cross(w, Jw)

    f = f_des * self._g * self._mass / self._max_thrust / 4
    u_p, u_q, u_r = u_w[:, 0], u_w[:, 1], u_w[:, 2]

    motor = np.empty((self.num_envs, 4), dtype=np.float32)
    motor[:, 0] = f - u_p - u_q - u_r
    motor[:, 1] = f + u_p - u_q + u_r
    motor[:, 2] = f - u_p + u_q + u_r
    motor[:, 3] = f + u_p + u_q - u_r
    np.clip(motor, 0, 1, out=motor)
    return motor
```

CTBR is a much easier action space for the policy to learn than raw motor commands: the low-level controller handles the fast attitude-rate dynamics, while the policy to reason about thrust and desired rotation.
This also helps when trying to deploy the policy on a real drone, as most controllers like Betaflight take in CTBR inputs.

The code implements a simple proportional controller, with the exception of the term `np.cross(w, Jw)`.
To undestand what it does, let's write Euler's rotation equation for the body-frame angular velocity $$\omega$$:

$$
J \dot{\omega} = \mathbf{\tau} - \omega \times J \omega
$$

The $$\omega \times J\omega$$ term is the gyroscopic coupling that comes from writing the equation in a rotating (body) frame: it couples the three rotation axes together, so a pure roll rate can, through this term, generate a pitch or yaw acceleration.
If we commanded torque $$\mathbf{\tau} = K_p (\omega_{des} - \omega)$$ directly, this coupling term would remain in the closed-loop dynamics and distort the simple proportional response we want.

Adding it back with a `+` sign, `u_w = K_p * (w_des - w) + np.cross(w, Jw)`, cancels it exactly once it is plugged back into Euler's equation:

$$
J \dot{\omega} = \underbrace{K_p (\omega_{des} - \omega) + \omega \times J \omega}_{\mathbf{\tau}} - \, \omega \times J \omega = K_p (\omega_{des} - \omega)
$$

The two $$\omega \times J\omega$$ terms cancel, resulting in a clean linear first-order response per axis.
This is a small instance of feedback linearization (also called dynamic inversion): we use the known nonlinear dynamics to compute the exact torque that cancels their nonlinearity, so the remaining closed-loop system behaves like the simple linear system we designed the gain $$K_p$$ for.

### Observation design

The observation is the 13-dimensional MuJoCo free-body state: position, attitude quaternion, linear velocity, and body-frame angular velocity.

```python
obs[:, 0:3] = qpos[:, :3]       # position
obs[:, 3:7] = qpos[:, 3:7]      # attitude quaternion
obs[:, 7:10] = qvel[:, :3]      # linear velocity
obs[:, 10:13] = omega_body      # body-frame angular velocity
```

### Hover reward

The reward is a potential-based progress term on the negative distance to the target, an orientation penalty, a crash penalty, and a small alive bonus:

```python
def _reward(
    self,
    curr_obs: NDArray,
    terminated: NDArray,
) -> tuple[NDArray, NDArray]:
    pos = curr_obs[:, 0:3]
    dist = np.linalg.norm(pos - _TARGET_POS, axis=1)
    curr_potential = -dist
    progress = curr_potential - self._prev_potential

    quat_xyz = curr_obs[:, 4:7]
    orientation = -0.2 * np.linalg.norm(quat_xyz, axis=1)

    crash = np.where(terminated, -5.0, 0.0)
    alive = np.where(terminated, 0.0, 0.1)

    total = progress + orientation + crash + alive
    return total, curr_potential
```

Using a potential-based reward turned out to be essential for fast training.

### Results

We trained this hover environment against three different hover targets.
For the exact hypeparameters refer to [src/quadcopter_racing/part_2.py](https://github.com/mrandri19/quadcopter-racing/blob/main/src/quadcopter_racing/part_2.py#L336)
In all three cases, `crash_rate` stays around 1 for millions of steps before collapsing sharply, then `distance_to_target_mean` keeps decreasing for the rest of training.

<img src="/assets/images/drone-racing-with-reinforcement-learning/hover_training.svg" alt="Hover training curves for the three targets: crash_rate and distance_to_target_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">

## From hovering to racing

Hovering at a point checks that the low-level controller, reward scale, and PPO hyperparameters are implemented correctly.
With that implemented and tested, we move to our next goal: racing.
For that, we extend the hover environment into an eight-gate loop track.

### Next gate in observation

We define two tracks: an eight-gate loop, one gate every 45 degrees around the origin at varying altitude, and a seven-gate split-S track (gate positions taken from Kaufmann2023's `track.yaml`, dropping their orientation since our gates are point targets, not oriented rectangles).
The split-S name comes from gates 4 and 5, which sit at the same $$(x, y)$$ but drop from $$z=3.4$$ to $$z=1.42$$, forcing a steep vertical dive between them.

Regardless of the track, the position of the next gate gets appended to the observation, making the observation space to 16 dimensional:

```python
obs[:, 13:16] = target_gates
```

As soon as we pass a gate, the environment updates the observation.
Again, for more details check out the source code, in particular: [src/quadcopter_racing/part_3.py](https://github.com/mrandri19/quadcopter-racing/blob/main/src/quadcopter_racing/part_3.py#L218)

### Next-gate reward

The reward keeps the same shape as the hover reward: progress, orientation penalty, crash penalty, alive bonus.
The only addition is a one-off bonus when the quadcopter passes within `_GATE_RADIUS` of the target gate, at which point the target advances to the next gate in the loop:

```python
passed = (dist < _GATE_RADIUS) & ~terminated.astype(bool)
gate_bonus = np.where(passed, _GATE_BONUS, 0.0)

total = progress + orientation + crash + alive + gate_bonus
```

When a gate is passed, we also reset the potential to the new target so the progress term has no discontinuity from the target switch:

```python
if passed.any():
    n_gates = len(self._gates)
    new_ix = (self._target_gate_indices[passed] + 1) % n_gates
    self._target_gate_indices[passed] = new_ix
    self._target_gates[passed] = self._gates[new_ix]
    curr_potential[passed] = -np.linalg.norm(
        obs[passed, 0:3] - self._target_gates[passed], axis=1
    )
    obs[passed, 13:16] = self._target_gates[passed]
    self._gates_passed_counts[passed] += 1
```

### Random gate reset is crucial

The most important detail is how episodes reset.
If every episode always spawns at gate 0, the policy must first perfect passing gate 1 before seeing gate 2 for the first time.
This makes learning really hard, as the policy has very little incentive to learn how to use the target gate in its observation.
Instead, every reset picks a random start gate and targets the next one in the loop:

```python
n_gates = len(self._gates)
start_gate_ix = self._rng.integers(0, n_gates)
target_gate_ix = (start_gate_ix + 1) % n_gates
start_gate = self._gates[start_gate_ix, :]
target_gate = self._gates[target_gate_ix, :]
```

This turns one long, hard racing task into many short, varied one-gate tasks, which is a much easier curriculum for PPO to learn from.

### Results

Same environment, reward, and hyperparameters, run against both tracks.
We now also track `gates_passed_mean`, the mean number of gates passed per episode.

<img src="/assets/images/drone-racing-with-reinforcement-learning/circle_training.svg" alt="Circle-track training curves: crash_rate, distance_to_target_mean, and gates_passed_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">


The same takeoff pattern from the hover runs shows up again: `crash_rate` stays around for most of training, then collapses between 2.9M and 3.8M steps.
Past that point, `gates_passed_mean` keeps climbing steadily, reaching 3.71 gates per 400-step (8 second) episode by the end of training.
That means the converged policy isn't just reaching one gate, it is chaining several gate passages together in a single episode, closer to the racing behavior we actually want.

The Rerun visualization below shows the converged policy flying 24 seconds (1,200 steps), passing 21 gates:

<figure>
    <iframe src="https://app.rerun.io/version/0.28.2/?url=https://mrandri19.github.io/assets/images/drone-racing-with-reinforcement-learning/circle.rrd"
    allow="local-network-access" style="width: 80vw; height: 60vh; display: block; margin-left: 50%; transform: translateX(-50%);"></iframe>
</figure>

<img src="/assets/images/drone-racing-with-reinforcement-learning/split_s_training.svg" alt="Split-S track training curves: crash_rate, distance_to_target_mean, and gates_passed_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">


`crash_rate` collapses to 0 around 6.7M steps, and `gates_passed_mean` reaches 3.55, right in line with `TRACK_CIRCLE`'s 3.71 at 5M steps.
The split-S track's irregular gate spacing and the steep vertical dive between gates 4 and 5 don't need a different reward or hyperparameters, just a longer takeoff window before PPO finds the working policy.

The Rerun visualization below shows the converged policy flying 24 seconds (1,200 steps), passing 12 gates despite the harder vertical maneuver between gates 4 and 5:

<figure>
    <iframe src="https://app.rerun.io/version/0.28.2/?url=https://mrandri19.github.io/assets/images/drone-racing-with-reinforcement-learning/split_s.rrd"
    allow="local-network-access" style="width: 80vw; height: 60vh; display: block; margin-left: 50%; transform: translateX(-50%);"></iframe>
</figure>

## Takeaways and what's next

Any complex project requires decomposing the final objective into smaller milestones, and and RL project is no different.
For this specific problem, it turns out that going from toy task to hovering to racing is a nice progression.

Let's briefly discuss what the limitations currently are:

We rely on perfect state estimation: the policy observes ground-truth position, attitude, and velocity, not sensor data like an IMO or camera
If I were to address that, I would try to re-implement ["Demonstrating Agile Flight from Pixels without State Estimation"](https://arxiv.org/pdf/2406.12505)

Simulation only, not deployed on real hardware.
I don't own a physical drone and a racing track, but if I wanted to approach sim2read, I would start with massive domain randomization, like in
["Demonstrating Agile Flight from Pixels without State Estimation"](https://arxiv.org/pdf/2406.12505) or sim2real2sim approaches like in
[Champion-level drone racing using deep reinforcement learning](https://www.nature.com/articles/s41586-023-06419-4).

We must traing for each track, can't zero-shot to unseen track layouts.
According to
[Bridging Performance and Generalization in Reinforcement Learning for Agile Flight](https://arxiv.org/pdf/2606.27348)
this is not that hard to solve.
The recipe is simple: generate random racing tracks and train on a massively diverse dataset of them.
