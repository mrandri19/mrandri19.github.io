---
layout: post
title: "[DRAFT] A recipe for drone racing with reinforcement learning"
---

<link rel="stylesheet" href="/assets/katex/katex.min.css">
<script defer src="/assets/katex/katex.min.js"></script>
<script
    defer
    src="/assets/katex/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body);"
>
</script>

* TOC
{:toc}

This post is the third and final post in our series on quadcopter simulation.
The [first post]({% post_url 2026-04-03-2d-quadcopter-simulation %}) and [second post]({% post_url 2026-04-11-3d-quadcopter-simulation %}) derived and simulated the quadcopter's equations of motion, first in 2D and then in 3D.
In this post we train a reinforcement learning policy to fly the quadcopter, first to hover at a fixed point, then to fly through a sequence of gates.

The previous posts were tutorial-like, we started from a free body diagram and, step-by-step, arrived to simulation code.
This post instead is more recipe-like, a collection of tricks and techniques I found useful to train a drone racing RL policy.
There is no rigorous proof of why these methods work, only empirical.

## An incremental approach

Trying to implement a drone racing simulation, RL environment, reward, and model all at once is recipe for disaster.
Too many things can be slightly off, affecting the policy's performace, without a good way to debug it.
Because of this, we split the task in three stages, each building on top of each other:

1. The "Hello, world! of RL": train a policy to solve the inverted pendulum control problem with PPO and a vectorized [stable-baselines3](https://stable-baselines3.readthedocs.io/) env.
2. Building a custom quadcopter RL environment using MuJoCo, choosing action and observation spaces, splitting high-level RL-based and low-level P-controller, and hover reward.
3. Extending the env from hover to racing, with a new reward, observation, and random initialization design.

## Vectorized environment and PPO

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

- **Rollout size** is `n_envs * n_steps`: with 128 environments and 512 steps each, PPO collects 65,536 transitions before every policy update.
Having this batch be large enough is crucial, as we want variety in the dataset we used to train at each PPO update.
- **Number of PPO updates** is `total_timesteps / rollout_size`. Given a large enough rollout size, it's then crucial that our model has enough times to "evolve" during the training process. This is not supervised learning, where the dataset is fixed. As the policy evolves, new patterns appear in the rollout data, so we want enough PPO updates to explore this space.
- **Number of gradient steps** is `total_timesteps * n_epochs / batch_size`: each rollout is split into minibatches of `batch_size` and reused for `n_epochs` passes. Finally, the bigger the batch size, the less noisy the gradient but the fewer training iterations we do per PPO update.

### Results

On this environment, each alive step gives +1 reward, so episode length and reward will match exactly.
Training runs for 750k timesteps across 128 parallel environments, or 12 PPO updates.
Episode length grows smoothly from the first update, and the policy is near the 1,000-step cap by 600k steps.

<img src="/assets/images/drone-racing-with-reinforcement-learning/cartpole_training.svg" alt="Cartpole training curves: ep_len_mean and ep_rew_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">

## Custom MuJoCo quadcopter environment

Now that we have shown that PPO plus our hyperparameters works on a toy task, let's develop the quadcopter environment and setup a simple hover reward.

### Action design: CTBR + P controller

The policy does not directly output four motor commands. Instead, it outputs a collective thrust and body rates(CTBR) command: mass-normalized thrust and desired roll, pitch, and yaw rates.
A low-level proportional (P) controller then converts this into per-motor commands, using the current body-frame angular velocity as feedback:

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

**TODO**

CTBR is a much easier action space for the policy to learn than raw motor commands: the low-level controller absorbs the fast attitude-rate dynamics, leaving the policy to reason about thrust and desired rotation only.

The `np.cross(w, Jw)` term deserves an explanation, since it is not part of the proportional feedback itself.
Euler's rotation equation for the body-frame angular velocity $$\omega$$ is:

$$
J \dot{\omega} = \mathbf{\tau} - \omega \times J \omega
$$

The $$\omega \times J\omega$$ term is the gyroscopic coupling that comes from writing the equation in a rotating (body) frame: it couples the three rotation axes together, so a pure roll rate can, through this term, generate a pitch or yaw acceleration.
If we commanded torque $$\mathbf{\tau} = K_p (\omega_{des} - \omega)$$ directly, this coupling term would remain in the closed-loop dynamics and distort the simple proportional response we want.

Adding it back with a `+` sign, `u_w = K_p * (w_des - w) + np.cross(w, Jw)`, cancels it exactly once it is plugged back into Euler's equation:

$$
J \dot{\omega} = \underbrace{K_p (\omega_{des} - \omega) + \omega \times J \omega}_{\mathbf{\tau}} - \, \omega \times J \omega = K_p (\omega_{des} - \omega)
$$

The two $$\omega \times J\omega$$ terms cancel, leaving a clean, decoupled, linear first-order response per axis.
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

The alive bonus matters more than it looks: without it, an early policy that crashes quickly and a policy that survives but drifts away from the target can score similarly, since both accumulate negative progress. The alive bonus breaks that tie in favor of survival.

One termination threshold is worth calling out explicitly: `min_altitude`, the height below which we terminate the episode as a crash.
Set too low (0.01, close to the floor geometry itself), the quadcopter can hit the ground and then bounce or crawl along the floor for the rest of the episode instead of terminating.
That crawling regime dominates the training signal: most of the reward comes from noisy floor-contact dynamics rather than from the policy actually flying, and `crash_rate` stays pinned near 1.0 indefinitely because episodes never end cleanly, they just drag on near the floor.

This is the same failure mode I ran into earlier in the project, in an entirely different guise: MuJoCo's floor contact happened to be a source of exploration (the quadcopter could "explore while crawling on the floor"), but a floorless native rewrite of the simulator had nothing to substitute for it, and the policy suffered entropy collapse instead.
Here, the fix is simpler: raise `min_altitude` to 0.3, well above where floor contact starts. This forces a clean, immediate termination once the quadcopter drops out of a reasonable flight envelope, so the crash penalty fires promptly and the progress reward reflects actual flight, not bouncing. With that single change, training converges reliably to the results below.

### Results

We trained this hover environment against three targets, all with the reward above, 128 parallel environments, and 5M timesteps of PPO. In all three cases, `crash_rate` stays at 1.0 for millions of steps before collapsing sharply, then `distance_to_target_mean` keeps tightening for the rest of training.

<img src="/assets/images/drone-racing-with-reinforcement-learning/hover_training.svg" alt="Hover training curves for the three targets: crash_rate and distance_to_target_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">


The delayed-then-sharp convergence pattern repeats across all three targets, regardless of where the target sits. This is consistent with PPO's takeoff-timing variance: the policy spends most of training with an undifferentiated, crash-prone behavior, until it stumbles onto the basin around a working solution and then improves quickly.

## From hover to a loop track

Hovering at a point checks that the low-level controller, reward scale, and PPO hyperparameters are sane. It does not check whether the policy can pursue a *moving* target or chain multiple objectives together. For that, we extend the hover environment into an eight-gate loop track.

### Next gate in observation

The track itself is a constructor argument, `track_gates`, rather than something baked into the environment. That makes it a one-line change to point the same environment at a different layout. We define two tracks: an eight-gate loop, one gate every 45 degrees around the origin at varying altitude, and a seven-gate split-S track (gate positions taken from Kaufmann2023's `track.yaml`, dropping their orientation since our gates are point targets, not oriented rectangles). The split-S name comes from gates 4 and 5, which sit at the same $$(x, y)$$ but drop from $$z=3.4$$ to $$z=1.42$$, forcing a steep vertical dive between them.

```python
TRACK_CIRCLE = np.array(
    [
        [7.0, 0.0, 4.0],     # 0deg
        [4.95, 4.95, 3.0],   # 45deg
        [0.0, 7.0, 2.5],     # 90deg
        [-4.95, 4.95, 3.5],  # 135deg
        [-7.0, 0.0, 5.0],    # 180deg
        [-4.95, -4.95, 6.0], # 225deg
        [0.0, -7.0, 5.5],    # 270deg
        [4.95, -4.95, 4.5],  # 315deg
    ]
)

TRACK_SPLIT_S = np.array(
    [
        [-0.6, -0.86, 3.68],
        [9.0, 6.45, 1.05],
        [8.85, -3.8, 1.05],
        [-4.3, -5.6, 3.4],
        [-4.3, -5.6, 1.42],
        [4.5, -0.45, 1.05],
        [-1.95, 6.81, 1.05],
    ]
)
```

Whichever track is passed in, the position of the *next* gate gets appended to the observation (dimension 16, up from 13):

```python
obs[:, 13:16] = target_gates
```

### Similar reward, but now for the next gate

The reward keeps the same shape as the hover reward: progress, orientation penalty, crash penalty, alive bonus. The only addition is a one-off bonus when the quadcopter passes within `_GATE_RADIUS` of the target gate, at which point the target advances to the next gate in the loop:

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

The most important detail is how episodes reset. If every episode always spawns at gate 0, the policy only ever practices approaching gate 0, and never learns to fly through gates approached from the other seven directions and altitudes. Instead, every reset picks a **random** start gate and targets the next one in the loop:

```python
n_gates = len(self._gates)
start_gate_ix = self._rng.integers(0, n_gates)
target_gate_ix = (start_gate_ix + 1) % n_gates
start_gate = self._gates[start_gate_ix, :]
target_gate = self._gates[target_gate_ix, :]
```

This turns one long, hard racing task into many short, varied one-gate tasks, which is a much easier curriculum for PPO to learn from.

### Results

Same environment, reward, and hyperparameters, run against both tracks. We now also track `gates_passed_mean`, the mean number of gates passed per episode.

**`TRACK_CIRCLE`**, 128 parallel environments, 5M timesteps:

<img src="/assets/images/drone-racing-with-reinforcement-learning/circle_training.svg" alt="Circle-track training curves: crash_rate, distance_to_target_mean, and gates_passed_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">


The same takeoff pattern from the hover runs shows up again: `crash_rate` stays at 1.0 for most of training, then collapses between 2.9M and 3.8M steps. Past that point, `gates_passed_mean` keeps climbing steadily, reaching 3.71 gates per 400-step (8 second) episode by the end of training. That means the converged policy isn't just reaching one gate, it is chaining several gate passages together in a single episode, closer to the racing behavior we actually want.

The Rerun visualization below shows the converged policy flying 24 seconds (1,200 steps), passing 21 gates:

<figure>
    <iframe src="https://app.rerun.io/version/0.28.2/?url=https://mrandri19.github.io/assets/images/drone-racing-with-reinforcement-learning/circle.rrd"
    allow="local-network-access" style="width: 100%; height: 60vh; display: block; margin: auto;"></iframe>
    <figcaption>Circle track, 5M training steps.</figcaption>
</figure>

**`TRACK_SPLIT_S`**, same setup, 8M timesteps:

<img src="/assets/images/drone-racing-with-reinforcement-learning/split_s_training.svg" alt="Split-S track training curves: crash_rate, distance_to_target_mean, and gates_passed_mean vs. timesteps." style="display: block; margin: auto; max-width: 100%;">


`crash_rate` collapses to 0 around 6.7M steps, and `gates_passed_mean` reaches 3.55, right in line with `TRACK_CIRCLE`'s 3.71 at 5M steps. The split-S track's irregular gate spacing and the steep vertical dive between gates 4 and 5 don't need a different reward or hyperparameters, just a longer takeoff window before PPO finds the working policy.

The Rerun visualization below shows the converged policy flying 24 seconds (1,200 steps), passing 12 gates despite the harder vertical maneuver between gates 4 and 5:

<figure>
    <iframe src="https://app.rerun.io/version/0.28.2/?url=https://mrandri19.github.io/assets/images/drone-racing-with-reinforcement-learning/split_s.rrd"
    allow="local-network-access" style="width: 100%; height: 60vh; display: block; margin: auto;"></iframe>
    <figcaption>Split-S track, 8M training steps.</figcaption>
</figure>

## Takeaways and what's next

Three deliberate steps: validate the training loop on a toy task, get a hover policy working with the real action space and dynamics, then extend hover into gate-following. At each step, the previous stage's environment and reward carried over almost unchanged, and only the target changed shape from a fixed point to a moving next-gate observation.

Honest limitations of where this stands today:

- Perfect state estimation: the policy observes ground-truth position, attitude, and velocity, not sensor data.
- Simulation only, not deployed on real hardware.
- A known, fixed track, not zero-shot to arbitrary layouts.
- No vision policy yet: state is privileged, not pixels.

TODO: describe what's next
