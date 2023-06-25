---
jupyter:
  kernelspec:
    display_name: Python 3 (ipykernel)
    language: python
    name: python3
  language_info:
    codemirror_mode:
      name: ipython
      version: 3
    file_extension: .py
    mimetype: text/x-python
    name: python
    nbconvert_exporter: python
    pygments_lexer: ipython3
    version: 3.10.6
  nbformat: 4
  nbformat_minor: 5
---

Very much a work in progress writing-wise.
The code for 1D variational inference is ready but I need to explain what it does and how it connects to the previous post.
Lately I've been too busy and I wanted to post it anyway :)

``` python
import numpy as np
import seaborn as sns
import matplotlib.pyplot as plt
%config InlineBackend.figure_format='retina'
sns.set_theme(style='darkgrid')
```

``` python
from scipy.stats import norm
from scipy.optimize import minimize
from scipy.integrate import quad
```

``` python
PRIOR_MU = 0
PRIOR_SIGMA = 5


def prior(theta):
    "p(f) = N(theta | 0, 5)"
    return norm.pdf(theta, loc=PRIOR_MU, scale=PRIOR_SIGMA)


def variational_posterior(theta, m, s):
    "q(theta) = N(theta | m, s))"
    return norm.pdf(theta, loc=m, scale=s)


def likelihood(y, theta):
    "p(y | theta) = 0.5 * N(y | theta + 1, 1) + 0.5 * N(y | theta - 2, 1.5)"
    return 0.5 * (
        norm.pdf(y, loc=theta + 1, scale=1) + norm.pdf(y, loc=theta - 2, scale=1.5)
    )


def posterior(theta, y):
    "p(theta | y) = p(y | theta) * p(theta) / p(y)"
    evidence, _ = quad(
        lambda theta_: likelihood(y, theta_) * prior(theta_),
        -np.inf,
        np.inf,
    )
    return likelihood(y, theta) * prior(theta) / evidence


def data_fit_term(y, m, s):
    "E_q(theta | m, s) [log p(y | theta)]"
    integral, _ = quad(
        lambda theta: variational_posterior(theta, m, s)
        * (np.log(likelihood(y, theta) + 1e-8)),
        -np.inf,
        np.inf,
    )
    return integral


def kl_term(m, s):
    "KL(q(theta | m, s) || p(theta))"
    return np.log(PRIOR_SIGMA / s) + (
        (s**2 + (m - PRIOR_MU) ** 2) / (2 * PRIOR_SIGMA**2) - 0.5
    )


def variational_objective(y, m, s):
    return data_fit_term(y, m, s) - kl_term(m, s)
```

``` python
def plot_variational_and_true_posterior(y, theta, m, s):
    fig, ax = plt.subplots(figsize=(8, 4))

    ax.plot(theta, prior(theta), label="$p(\\theta)$")
    ax.plot(theta, variational_posterior(theta, m, s), label="$q(\\theta)$")
    ax.plot(theta, posterior(theta, y), label="$p(\\theta | y)$")

    ax.set_xlabel("$\\theta$")
    ax.set_ylabel("Density")

    obj = variational_objective(y, m, s)

    ax.set_title(
        f"""
Prior, variational posterior, and true posterior
$m$={m:.2f}, $s$={s:.2f}, $L[q]$={obj:.2f}
    """
    )
    ax.legend()

    fig.tight_layout()
```

``` python
y = 3
theta = np.linspace(-20, 20, 1000)
plot_variational_and_true_posterior(y, theta, -0.5, 1.3)
```

![](/assets/images/introduction-to-variational-inference/57d2f18afcb7cc4975e7ddc52ba7b2c2b4ac7528.png)

``` python
res = minimize(
    lambda x: -variational_objective(y, x[0], x[1]),
    x0=[0, 5],
    bounds=[(-10, 10), (0.1, 10)],
)
m, s = res.x
plot_variational_and_true_posterior(y, theta, m, s)
```

![](/assets/images/introduction-to-variational-inference/678445be2018ea313ab2b6fdbb997c11360ed5c6.png)
