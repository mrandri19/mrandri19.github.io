---
layout: post
title: "Predictive sampling and graph traversals"
---

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css" integrity="sha384-R4558gYOUz8mP9YWpZJjofhk+zx0AS11p36HnD2ZKj/6JR5z27gSSULCNHIRReVs" crossorigin="anonymous">

<!-- The loading of KaTeX is deferred to speed up page rendering -->
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js" integrity="sha384-z1fJDqw8ZApjGO3/unPWUPsIymfsJmyrDVWC8Tv/a1HeOtGmkwNd/7xUS0Xcnvsx" crossorigin="anonymous"></script>

<!-- To automatically render math in text elements, include the auto-render extension: -->
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/contrib/auto-render.min.js" integrity="sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fIACpNNfIR" crossorigin="anonymous"
    onload="renderMathInElement(document.body);"></script>

> This post is the continuation of
> ["A probabilistic programming language in 70 lines of Python"](https://mrandri19.github.io/2022/01/12/a-PPL-in-70-lines-of-python.html),
> the implementation depends on the features we implemented in the previous post.

> Full code available at [github.com/mrandri19/smolppl/tree/sampling](https://github.com/mrandri19/smolppl/tree/sampling)

## Introduction

_Sampling_ is the act of drawing random values from a probability
distribution.
More exactly, sampling is the act of generating values from the sample space
of a distribution such that, as the number of samples increases, their frequency
will eventually match the distribution's probability density function (PDF)
(or mass function, for discrete distributions).

As users of a Probabilistic Programming Language (PPL) are interested in
sampling the prior distribution and the posterior distribution.
More precisely, we need samples from a distribution to compute Monte Carlo
integrals over it.
Why do we need to compute integrals?
Because expectations are integrals, which we use to compute mean, variance,
etc...

At the end we will have build an API like this one:

```python
x = LatentVariable("x", Normal, [0.0, 3.0])
y = ObservedVariable("y", Normal, [x, 4.0], observed=1.5)

prior_samples = [prior_sample(y) for _ in range(10_000)]
np.mean(prior_samples), np.std(prior_samples)
# => (0.0, 5.0)

posterior_samples = [posterior_sample(y, {"x": -2.0}) for _ in range(10_000)]
np.mean(posterior_samples), np.std(posterior_samples)
# => (-2.0, 4.0)
```

Which is equivalent to this probability model:

$$ x \sim \text{Normal}(0, 3) $$

$$ y \sim \text{Normal}(x, 4) $$

and these evaluating these expectations on it:

$$ E(y) = 0 $$

$$ \text{std}(y) = 5 $$

$$ E(y|x=-2) = -2 $$

$$ \text{std}(y|x=-2) = 4 $$

## Related work

Most probabilistic programming languages implement sampling , since it is so
useful.
We will briefly see how Stan and PyMC, two of the most popular PPLs, allow
sampling.
Just skip this section if you only care about the implementation.

Stan's sampling interface is lower-level compared to other PPLs.
Sampling from both the prior and the posterior must be implemented manually by
the user.
To perform [prior predictive](https://mc-stan.org/docs/2_28/stan-users-guide/prior-predictive-checks.html) sampling
the user must copy code from the `model` section into the `generated_quantities`
sections and replace all distribution calls (like `normal`, `binomial`) with
their `rng` equivalent.
For [posterior predictive](https://mc-stan.org/docs/2_28/stan-users-guide/simulating-from-the-posterior-predictive-distribution.html)
sampling, the procedure is similar, but model parameters are sampled from the
posterior chain rather than from a RNG.
In practice, this means that it is enough to keep using the same parameters as
in the `model` section.

In PyMC the process is much simpler from a user's perspective.
PyMC uses its knowledge of the probabilistic DAG to automatically generate
implementations for the likelihood evaluation, prior sampling, and posterior
sampling.
In practice this means calling `pm.sample_prior_predictive()` to get prior
samples
and `pm.sample_posterior_predictive(posterior_trace)` to get posterior samples.

## Method

The API we will implement is heavily inspired by PyMC.
The function `prior_sample` is used to take one sample from the prior
distribution.
The function `posterior_sample` is used to take on sample from the
posterior distribution, given a dictionary of latent values from the posterior.

Inside these functions we traverse the probabilistic DAG and do what a Stan user
would do.
In `prior_sample` replace all variables with a new random value from their
respective distribution.
In `posterior_sample` replace all `ObservedVariables` with a new random value
from its distribution, and replace all `LatentVariables` with values from the
posterior chain.
But how do we traverse our DAG? Is there a particular _order_ we need to use?

To understand how to traverse the DAG let us use an example.
Consider this probabilistic model:

$$ x \sim \text{Normal}(0, 3) $$

$$ y \sim \text{Normal}(x, 4) $$

in code:

```python
x = LatentVariable("x", Normal, [0.0, 3.0])
y = ObservedVariable("y", Normal, [x, 4.0], observed=1.5)
```

and its corresponding DAG:

<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/predictive-sampling-and-graph-traversals/DAG.svg"
  style="width: 16rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
In-memory representation of the model
</figcaption>
</figure>

Looking at the DAG we see that, to sample the `x` variable, we need the
floats 0 and 3 respectively for the mean and standard deviation.
To sample the `y` variable we need the value of `x` and the float value 4.
This means that we need the values of a variable's children before being able
to sample its value.
As a consequence, simple depth-first search (DFS) is not be enough.

For those who read the
[previous post](https://mrandri19.github.io/2022/01/12/a-PPL-in-70-lines-of-python.html),
I want to point out that likelihood evaluation does not have this dependency
structure.
The likelihood of each variable can be computed independently
([even in parallel!](https://www.multibugs.org/))
because we know all the children's values, either from `latent_values` or from
`variable.observed`.
Since the order does not matter, I decided to use DFS because of its simplicity.

We need to find an ordering that makes sure that our children have been
processed before we are processed.
Because of the structure of our DAG, what we need is called
[_post-order DFS_](https://en.wikipedia.org/wiki/Depth-first_search#Vertex_orderings).
Post-order traversal has the property that a node will only get visited _after_
all of its children have.

For those who are already familiar with DAG traversals, this is equivalent to
performing a
[_topological sorting_](https://en.wikipedia.org/wiki/Topological_sorting)
of the transposed DAG.
A topological ordering is the reversed post-ordering of a DAG, while in our
implementation we are doing a post-ordering on the transposed DAG, without
reversing at the end.
Perhaps surprisingly these two actions are equivalent:<br>
`reverse-list ∘ post-order-traversal ≡ post-order-traversal ∘ transpose-DAG`.

<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/predictive-sampling-and-graph-traversals/DAG-pre-order.svg"
  style="width: 16rem; min-width: 0;"/>
  <img src="/assets/images/predictive-sampling-and-graph-traversals/DAG-post-order.svg"
  style="width: 16rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
Left: pre-order traversal of the DAG.
Right: post-order traversal of the DAG.
<br>
The blue, bold numbers represent the order in which the nodes where visited.
</figcaption>
</figure>

## Implementation

After all this theory, let's now get to the fun part, the implementation.

> ### TODO(Andrea): finish

### Distributions

```python
class Distribution:
    <rest of class>

    @staticmethod
    def sample(params):
        raise NotImplementedError("Must be implemented by a subclass")


class Normal(Distribution):
    <rest of class>

    @staticmethod
    def sample(params):
        return float(norm.rvs(loc=params[0], scale=params[1]))
```

### Sampling from the prior

#### Post-order traversal

```python
def prior_sample(root):
    visited = set()
    variables = []

    def collect_variables(variable):
        if isinstance(variable, float):
            return

        visited.add(variable)

        for arg in variable.dist_args:
            if arg not in visited:
                collect_variables(arg)

        # post-order
        variables.append(variable)

    collect_variables(root)

    sampled_values = {}
    for variable in variables:
        dist_params = []
        for dist_arg in variable.dist_args:
            if isinstance(dist_arg, float):
                dist_params.append(dist_arg)
            else:
                dist_params.append(sampled_values[dist_arg.name])

        sampled_values[variable.name] = variable.dist_class.sample(
            dist_params
        )

    return sampled_values[root.name]
```

### Sampling from the posterior

```python
def posterior_sample(root, latent_values):
    visited = set()
    variables = []

    def collect_variables(variable):
        if isinstance(variable, float):
            return

        visited.add(variable)

        for arg in variable.dist_args:
            if arg not in visited:
                collect_variables(arg)

        # post-order
        variables.append(variable)

    collect_variables(root)

    sampled_values = {}
    for variable in variables:
        dist_params = []
        for dist_arg in variable.dist_args:
            if isinstance(dist_arg, float):
                dist_params.append(dist_arg)
            else:
                dist_params.append(sampled_values[dist_arg.name])

        if isinstance(variable, LatentVariable):
            sampled_values[variable.name] = latent_values[variable.name]
        if isinstance(variable, ObservedVariable):
            sampled_values[variable.name] = variable.dist_class.sample(
                dist_params
          )

    return sampled_values[root.name]
```

## Conclusion

---

- Aside
  - On a Directed Acyclic Graph this "dependency order" called "toposort", which is
    `reverse_list(post_order(dag))`. Why are we just using post-order?
    - [more on topological sorting applications](https://eli.thegreenplace.net/2015/directed-graph-traversal-orderings-and-applications-to-data-flow-analysis/)
    - Because our arrows are reversed and this is true:
      `post_order(reverse_arrows(dag)) == reverse_list(post_order(dag))`
    - Why is this true? I don't know, StackOverflow links
      [1](https://cs.stackexchange.com/questions/124725/is-topological-sort-of-an-original-graph-same-as-post-ordering-dfs-of-its-transp),
      [2](https://stackoverflow.com/questions/61419786/is-topological-sort-of-an-original-graph-same-as-dfs-of-the-transpose-graph)
