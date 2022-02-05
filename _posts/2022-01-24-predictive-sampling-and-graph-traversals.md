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

> Full code available at [github.com/mrandri19/smolppl/tree/sampling](https://github.com/mrandri19/smolppl/tree/sampling)

## Introduction

This post is the continuation of
["A probabilistic programming language in 70 lines of Python"](https://mrandri19.github.io/2022/01/12/a-PPL-in-70-lines-of-python.html).
Today, we extend the library built in the last post by creating an API for
sampling values from the prior and posterior distributions.

At the end we will have build an API like this one:

```python
x = LatentVariable("x", Normal, [0.0, 3.0])
y = ObservedVariable("y", Normal, [x, 4.0], observed=1.5)

prior_sample(y)
posterior_sample(y, {"x": -2.0})
```

As users of a Probabilistic Programming Language (PPL), we are interested in
sampling the distributions defined by our model.
We do it, for example, to estimate means and variances via Monte Carlo
integration.
This is how we would estimate the mean and standard deviation of
the random variables in our model using the new API:

```python
prior_samples = [prior_sample(y) for _ in range(10_000)]
np.mean(prior_samples), np.std(prior_samples)
# => (0.0, 5.0)

posterior_samples = [posterior_sample(y, {"x": -2.0}) for _ in range(10_000)]
np.mean(posterior_samples), np.std(posterior_samples)
# => (-2.0, 4.0)
```

Mathematically speaking, the two snippets above define this probability model:

$$ x \sim \text{Normal}(0, 3) $$

$$ y \sim \text{Normal}(x, 4) $$

and compute the following expectations on it:

$$ E(y) = 0 $$

$$ \text{std}(y) = 5 $$

$$ E(y|x=-2) = -2 $$

$$ \text{std}(y|x=-2) = 4 $$

## Related work

Most probabilistic programming languages implement sampling APIs.
We will briefly see how
[Stan](https://mc-stan.org/)
and
[PyMC](https://docs.pymc.io/en/v3/), two of the most popular PPLs, allow
sampling.
Just skip this section if you only care about the implementation.

Stan's sampling interface is lower-level compared to other PPLs.
Sampling from both the prior and the posterior must be implemented manually by
the user.
To perform [prior predictive](https://mc-stan.org/docs/2_28/stan-users-guide/prior-predictive-checks.html) sampling
the user must copy code from the `model` section into the `generated_quantities`
sections and replace all distribution calls (like `normal`, `binomial`) with
their `_rng` versions.
For [posterior predictive](https://mc-stan.org/docs/2_28/stan-users-guide/simulating-from-the-posterior-predictive-distribution.html)
sampling, the procedure is similar, but model parameters are sampled from the
posterior chain rather than from a Random Number Generator (RNG).
In practice, this means that it is enough to keep using the same parameters as
in the `model` section.

In PyMC the process is much simpler from a user's perspective.
PyMC uses its knowledge of the probabilistic DAG to automatically generate
implementations for the evaluating the likelihood, prior sampling, and posterior
sampling.
In practice, this means calling `pm.sample_prior_predictive()` to get prior
samples
and `pm.sample_posterior_predictive(posterior_trace)` to get posterior samples.

## Implementation

### DAG traversals

To understand the main challenge in sampling from a DAG let's see an example.
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
floats `0` and `3` respectively for the mean and standard deviation.
To sample the `y` variable we need the value of `x` and the float value `4`.
This means that we need the values of a variable's children _before_ being able
to sample its value.
As a consequence, simple depth-first search (DFS) is not be enough.
Otherwise, it could happen that we try sampling the value of `y` without knowing
its mean `x`.

The solution is called
[_post-order DFS_](https://en.wikipedia.org/wiki/Depth-first_search#Vertex_orderings).
Post-order traversal has the property that a node will only get visited _after_
all of its children have.
Simple DFS, on the other hand, does not have this property and does a
_pre-order_ traversal.
To better understand the differences, check out the figure below.
With pre-order traversal the root node $$ a $$ is always evaluated before the
children $$ b, c $$, and in one case $$ b $$ is evaluated before its child
$$ c $$ is.

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

The API we implement is heavily inspired by PyMC.
The function `prior_sample` samples one value from the prior distribution.
The function `posterior_sample` samples one value from the posterior, given a
dictionary of latent values from the posterior.
Let's see how to do it.

> TODO(Andrea): See if from now on it makes sense

### Distributions

First of all, we need to add a `sample` method to our `Distribution` abstract
class, and implement it for all of our distributions.
Just like we did for the log-density, we use SciPy.

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

We begin by implementing prior sampling as it is the simpler of the two.
We implement post-order depth-first search in the `collect_variables` inner
function.
It's very similar to pre-order DFS but, instead of appending `variable` to
to `variables` _before_ recursion, we do it _after_.
This results in a variable being "visited", only after we have reached a leaf
of the DAG.

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
```

Then, for every variable, we need to obtain the numeric value of every argument.
`float` arguments are already numeric so we take them as they are.
On the other hand, we will keep numeric values of variable in a dictionary
called `sampled_values`.
We are sure that we will never get a `KeyError` because of the post-order
traversal.
All children of a variable will be evaluated befoure evaluating the variable.

```python
    sampled_values = {}
    for variable in variables:
        dist_params = []
        for dist_arg in variable.dist_args:
            if isinstance(dist_arg, float):
                dist_params.append(dist_arg)
            else:
                dist_params.append(sampled_values[dist_arg.name])
```

After having all arguments, we call the variable's distribution `sample` method
with its arguments, to finally perform the sampling.
For prior sampling, we `sample` all types of variable, both `ObservedVariable`s
and `LatentVariable`s.
The result its stored in the `sampled_values` dict, to be used by one of the
variable's parents (this is a DAG, we can have multiple parents).

```python
        sampled_values[variable.name] = variable.dist_class.sample(
            dist_params
        )
```

Finally, we return the sampled value of our root variable.

```python
    return sampled_values[root.name]
```

Let's see an example:

```python
x = LatentVariable("x", Normal, [5.0, 0.1])
y = ObservedVariable("y", Normal, [x, 1.0], observed=1.5)

prior_sample(x)
# => 5.09

prior_sample(y)
# => 6.40
```

### Sampling from the posterior

Luckily, posterior sampling is not too different.
Again, we traverse the DAG in post-order, starting at the root, accumulating
variables inside `variables`.
The only difference being `latent_values`, which has the same role as it had in
`evaluate_log_density`: being a dictionary from latent variable names to their
numeric values.
When doing, for example, posterior predictive simulation we will use samples of
the posterior chain for the `latent_values` dictionary.

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
```

Again, we either use `float`s as they are, or fetch sampled children from the
`sampled_values` dictionary by their name.

```python
    for variable in variables:
        dist_params = []
        for dist_arg in variable.dist_args:
            if isinstance(dist_arg, float):
                dist_params.append(dist_arg)
            else:
                dist_params.append(sampled_values[dist_arg.name])
```

And finally the new bit: instead of sampling both latent and observed variables,
we only sample observed values.
Latent variables instead come from the `latent_values` dictionary, just like
they did in `evaluate_log_density`.

```python
        if isinstance(variable, LatentVariable):
            sampled_values[variable.name] = latent_values[variable.name]
        if isinstance(variable, ObservedVariable):
            sampled_values[variable.name] = variable.dist_class.sample(
                dist_params
          )

    return sampled_values[root.name]
```

Let's see an example:

```python
x = LatentVariable("x", Normal, [5.0, 0.1])
y = ObservedVariable("y", Normal, [x, 1.0], observed=1.5)

posterior_sample(y, {"x": -2})
# => 3.19
posterior_sample(x, {"x": -2})
# => -2.00
```

## Conclusion

> TODO(Andrea): write

<!-- ## Bonus: more on DAG traversals

<!-- Inside these functions we traverse the probabilistic DAG and do what a Stan user
would do.
In `prior_sample` replace all variables with a new random value from their
respective distribution.
In `posterior_sample` replace all `ObservedVariables` with a new random value
from its distribution, and replace all `LatentVariables` with values from the
posterior chain.
But how do we traverse our DAG? Is there a particular _order_ we need to use? -->

> TODO(Andrea): make this make sense

For those who read the
[previous post](https://mrandri19.github.io/2022/01/12/a-PPL-in-70-lines-of-python.html),
I want to point out that likelihood evaluation does not have this dependency
structure.
The likelihood of each variable can be computed independently
([even in parallel!](https://www.multibugs.org/))
because we know all the children's values, either from `latent_values` or from
`variable.observed`.
Since the order does not matter, I decided to use DFS because of its simplicity.

For people familiar with DAG traversals, this is equivalent to performing a
[_topological sorting_](https://en.wikipedia.org/wiki/Topological_sorting)
of the transposed DAG.
A topological ordering is the reversed post-ordering of a DAG, while in our
implementation we are doing a post-ordering on the transposed DAG, without
reversing at the end.
Perhaps surprisingly these two actions are equivalent:<br>
`reverse-list ∘ post-order-traversal ≡ post-order-traversal ∘ transpose-DAG`.

- On a Directed Acyclic Graph this "dependency order" called "toposort", which is
  `reverse_list(post_order(dag))`. Why are we just using post-order?
  - [more on topological sorting applications](https://eli.thegreenplace.net/2015/directed-graph-traversal-orderings-and-applications-to-data-flow-analysis/)
  - Because our arrows are reversed and this is true:
    `post_order(reverse_arrows(dag)) == reverse_list(post_order(dag))`
  - Why is this true? I don't know, StackOverflow links
    [1](https://cs.stackexchange.com/questions/124725/is-topological-sort-of-an-original-graph-same-as-post-ordering-dfs-of-its-transp),
    [2](https://stackoverflow.com/questions/61419786/is-topological-sort-of-an-original-graph-same-as-dfs-of-the-transpose-graph) -->
