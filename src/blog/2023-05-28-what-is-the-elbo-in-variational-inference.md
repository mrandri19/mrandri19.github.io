---
layout: post
title: "What is the ELBO in Variational Inference?"
---

<script
    defer
    src="/assets/common/katex/contrib/auto-render.min.js"
    onload="renderMathInElement(document.body);"
>
</script>

## Bayesian Inference

### The three main objects of Bayesian inference

In Bayesian Inference, there are **three main objects** we want to study:

- The **distribution of observations** $y \sim Y$. Under the Bayesian framework, we believe that the observed data is sampled from a probability distribution.
  For example, if we measure the height of every person in a group of people, we could assume that the observations come from a Normal distribution i.e. $\text{height} \sim N$.

- The **distribution of parameters** $\theta \sim \Theta$. Parameters describe the process that generates the observed data and cannot be observed directly.
  In our height measurement example, having picked a normal distribution for the observations, we can say that our parameters are the distribution's mean and variance i.e. $\theta = \{\mu, \sigma^2\}$.
  Crucially, we need to specify the distribution of all parameters before seeing any observation. For example, we could say that the mean comes from a standard normal distribution and the variance comes from a standard half-normal distribution i.e.
  $\mu \sim N(0, 1^2)$, and $\sigma^2 \sim N^+(0, 1^2)$.
  Our complete model then would be that $\text{height} \sim N(\mu, \sigma^2)$.

- The **posterior distribution** $p\left(\theta \mid y \right)$ connects observations and parameters by specifying the distribution of parameters conditional on the value of the observations.
  In our example, it would tell us what the mean and the variance of the height are.
  A possible posterior distribution could be $\mu \mid y \sim N(1.79, 0.05^2)$ and $\sigma^2 \mid y \sim N^+(0.10, 0.03^2)$.

### Bayes' theorem, likelihood, prior, and evidence

How to obtain the posterior distribution? Given some observations, how do we know which parameters generated them?
This is where **Bayes' theorem** comes in.
It tells us how to write the Probability Density Function (PDF) of the posterior distribution using three simpler PDFs:

$$
  \underbrace{
    p\left(\theta \mid y\right)
  }_\text{posterior}
  =
  \frac{
    \overbrace{
      p\left(y \mid \theta\right)
    }^\text{likelihood}
    \overbrace{
      p\left( \theta \right)
    }^\text{prior}
  }{
    \underbrace{
      p\left( y \right)
    }_\text{evidence}
  }
$$

We define our model by directly choosing the **prior** $p\left( \theta \right)$ and the **likelihood** $p\left(y \mid \theta\right)$ so they are usually easy to evaluate.
The **evidence** $p\left( y \right)$ however, is not clearly computable, especially when written in this formulation.

### Law of total probability and intractability of the evidence integral

We can use the **law of total probability** to rewrite the evidence in terms of objects that we know, the prior and the likelihood:

$$
p\left( y \right)
=
\int p\left( y \mid \theta \right) p\left( \theta \right) d\theta
$$

The intuition behind this is that the integral of the PDF of the posterior distribution must be equal to 1 to be a valid distribution. The "shape" of the posterior PDF is only determined by the likelihood times the posterior. To make the integral of likelihood times posterior equal to one, we divide by a constant. The evidence is this constant.

Unfortunately, for most interesting applications **the evidence integral has no closed-form solution** (Gaussian Processes are one of the few interesting exceptions).
Because of this, **we cannot directly use Bayes' theorem to compute our posterior** but we will have to take a more "approximate" route.

## Variational Inference

### Approximate variational posterior

Given that we cannot directly know the posterior's PDF (and thus its distribution) by applying Bayes' theorem, let's do something else.
What if, instead of getting the exact posterior distribution, we got "close enough" by finding a distribution $q\left( \theta \right)$ that is very similar to the posterior $p\left(\theta \mid y\right)$ and also very easy to compute?
Let's call this distribution $q\left( \theta \right)$ **the variational posterior**.

What does it mean for $q\left( \theta \right)$ to be "close" to $p\left(\theta \mid y\right)$? To answer that, we need a notion of distance between distributions. The distance we are going to use is the **KL-divergence**:

$$
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
\stackrel{\text{def}}{=}
\int{
    q\left( \theta \right)
    \log\left(
    \frac{
        q\left( \theta \right)
    }{
        p\left(\theta \mid y\right)
    }
    \right)
}
d\theta
$$

With the distance between variational and true posterior defined, we can define our
**target variational distribution as the solution of the optimization problem**:

$$
q^*\left( \theta \right)
=
\argmin_q \text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
$$

### Solving the variational optimization problem

Let's **write down the definition of KL-divergence** and apply the properties of logarithms:

$$
\begin{aligned}
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
&=
\int{
    q\left( \theta \right)
    \log\left(
    \frac{
        q\left( \theta \right)
    }{
        p\left(\theta \mid y\right)
    }
    \right)
}
d\theta \\
&=
\int{
    q\left( \theta \right)
    \left[
        \log\left(
            q\left( \theta \right)
        \right)
        -
        \log\left(
            p\left(\theta \mid y\right)
        \right)
    \right]
}
d\theta \\
\end{aligned}
$$

The main problem with this expression is that our true posterior $p\left(\theta \mid y\right)$ is on both sides of the expression.
Let's work on the right hand side and **remove the true posterior by using Bayes' theorem** and the properies of logarithms:


$$
\begin{aligned}
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
&=
\int{
    q\left( \theta \right)
    \left[
        \log\left(
            q\left( \theta \right)
        \right)
        -
        \log\left(
            p\left(\theta \mid y\right)
        \right)
    \right]
}
d\theta \\
&=
\int{
    q\left( \theta \right)
    \left[
        \log\left(
            q\left( \theta \right)
        \right)
        -
        \log\left(
          \frac{
              p\left(y \mid \theta\right)
              p\left( \theta \right)
          }{
              p\left( y \right)
          }
        \right)
    \right]
}
d\theta \\
&=
\int{
    q\left( \theta \right)
    \left[
        \log\left(
            q\left( \theta \right)
        \right)
        -
        \left(
            \log p\left(y \mid \theta\right)
            +
            \log p\left( \theta \right)
            -
            \log p\left( y \right)
        \right)
    \right]
}
d\theta \\
&=
\int{
    q\left( \theta \right)
    \left[
        \log\left(
            q\left( \theta \right)
        \right)
        -
        \log p\left(y \mid \theta\right)
        -
        \log p\left( \theta \right)
        +
        \log p\left( y \right)
    \right]
}
d\theta \\
&=
\int{
    q\left( \theta \right)
    \left(
        \log q\left( \theta \right)
        -
        \log p\left( \theta \right)
    \right)
    d\theta
}
-
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
+
\int{
    q\left( \theta \right)
    \log p\left( y \right)
    d\theta
}
\\
&=
\int{
    q\left( \theta \right)
    \log\left(
        \frac{
            q\left( \theta \right)
        }{
            \log p\left( \theta \right)
        }
    \right)
    d\theta
}
-
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
+
\int{
    q\left( \theta \right)
    \log p\left( y \right)
    d\theta
}
\\
\end{aligned}
$$

We can now notice that **the first term is a KL-divergence**, and that
**in the last term, $\log p\left( \theta \right)$ can be extracted from the integral**, which sums up to 1:

$$
\begin{aligned}
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
&=
\int{
    q\left( \theta \right)
    \log\left(
        \frac{
            q\left( \theta \right)
        }{
            \log p\left( \theta \right)
        }
    \right)
    d\theta
}
-
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
+
\int{
    q\left( \theta \right)
    \log p\left( y \right)
    d\theta
}
\\
&=
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \right)
\right)
-
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
+
\log p\left( y \right)
\\
\end{aligned}
$$

We have achieved our goal, the true posterior only appears in a single term of the expression, currently the left hand side.
Let's rearrange the terms:

$$
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
=
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \right)
\right)
-
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
+
\log p\left( y \right)
$$

to get:

$$
\log p\left( y \right)
=
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
- \text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \right)
\right)
+
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
$$

### The ELBO

The final step requires noticing that **$\log{p(y)}$ is constant w.r.t. $\theta$**.
Thus, choosing a $\theta$ that increases the first right term will make the second term smaller.

$$
\overbrace{
    \log p\left( y \right)
}^\text{the evidence is a constant}
=
\overbrace{
    \int{
        q\left( \theta \right)
        \log p\left(y \mid \theta\right)
        d\theta
    }
    - \text{KL}\left(
        q\left( \theta \right)
        \middle\|
        p\left(\theta \right)
    \right)
}^\text{so when the 1st term increases}
+
\overbrace{
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \mid y\right)
\right)
}^\text{the 2nd term must decrease}
$$

And we are done!
Let's give a name to the 1st term, i.e. **the Evidence Lower BOund (ELBO)**:

$$
\text{ELBO}(\theta)
\stackrel{\text{def}}{=}
\int{
    q\left( \theta \right)
    \log p\left(y \mid \theta\right)
    d\theta
}
-
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \right)
\right)
$$

Then **maximising the ELBO is equivalent to minimizing the variational loss**
$$
\text{KL}\left(
    q\left( \theta \right)
    \middle\|
    p\left(\theta \right)
\right)
$$

