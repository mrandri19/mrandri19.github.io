---
layout: post
title: "[DRAFT] Gaussian Processes are more flexible than you think"
---
<!-- KaTeX -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css" integrity="sha384-R4558gYOUz8mP9YWpZJjofhk+zx0AS11p36HnD2ZKj/6JR5z27gSSULCNHIRReVs" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js" integrity="sha384-z1fJDqw8ZApjGO3/unPWUPsIymfsJmyrDVWC8Tv/a1HeOtGmkwNd/7xUS0Xcnvsx" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/contrib/auto-render.min.js" integrity="sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fIACpNNfIR" crossorigin="anonymous"
    onload="renderMathInElement(document.body);"></script>



## Squared Exponential

<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/what-my-thesis-is-about/se.png"
  style="width: 30rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
Multiple treatment data fitted using a Squared Exponential Kernel Gaussian
Process.
</figcaption>
</figure>

$$ f_{\text{SE}}(t) \sim \mathcal{GP}(0, k_{\text{SE}}(t, t'))$$

$$ k_{\text{SE}}(t, t') = \exp\left(-\frac{(t - t')^2}{2 \ell^2}\right)$$


## Time-Limited

<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/what-my-thesis-is-about/tlse.png"
  style="width: 30rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
Multiple treatment data fitted using a Time-Limited Squared Exponential Kernel
Gaussian Process.
</figcaption>
</figure>

$$
\begin{align*}
    f_{\text{TLSE}}(t) &= 1_{0 \le t \lt T}(t) \times f_{\text{SE}}(t) \\
        &\sim \mathcal{GP}(0, k_{\text{TLSE}}(t, t'))
\end{align*}
$$

$$
k_{\text{TLSE}}(t, t') =
    k_{\text{SE}}(t, t')
    \times 1_{0 \le t \lt T, 0 \le t' \lt T}(t)
$$

## Multiple-Treatment


<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/what-my-thesis-is-about/mttlse.png"
  style="width: 30rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
Multiple treatment data fitted using a Multiple-Treatment Time-Limited Squared
Exponential Kernel Gaussian Process.
</figcaption>
</figure>

$$
\begin{align*}
    f_{\text{MTTLSE}}(t) &= \sum_{k=1}^{K} f_{\text{TLSE}}(t - \tau_k) \\
        &\sim \mathcal{GP}(0, k_{\text{MTTLSE}}(t, t'))
\end{align*}
$$

$$
k_{\text{MTTLSE}}(t, t') =
    \sum_{k=1}^{K} \sum_{k'=1}^{K'}
    k_{\text{TLSE}}(t - \tau_{k}, t' - \tau_{k'})
$$

## Soft-Time-Limited

<figure>
<div style="display: flex;flex-direction: row;flex-wrap: nowrap;align-content: flex-start;justify-content: space-evenly;align-items: center;">
  <img src="/assets/images/what-my-thesis-is-about/softmttlse.png"
  style="width: 30rem; min-width: 0;"/>
</div>
<figcaption style="text-align: center; margin-top: 1rem;">
Multiple treatment data fitted using a Multiple-Treatment Soft-Time-Limited
Squared Exponential Kernel Gaussian Process.
</figcaption>
</figure>

$$
\sigma(t) = \frac{1}{1 + \exp(- k t)}
$$

$$
\begin{align*}
    f_{\text{STLSE}}(t) &=
        \sigma(t)
        \times \sigma(T - t)
        \times f_{\text{SE}}(t) \\
        &\sim \mathcal{GP}(0, k_{\text{STLSE}}(t, t'))
\end{align*}
$$

$$
k_{\text{STLSE}}(t, t') =
    k_{\text{SE}}(t, t')
    \times \sigma(t)
    \times \sigma(T - t)
    \times \sigma(t')
    \times \sigma(T - t')
$$
