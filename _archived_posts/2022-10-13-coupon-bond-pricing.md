---
layout: post
title: "Pricing of coupon bonds"
---

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.css" integrity="sha384-R4558gYOUz8mP9YWpZJjofhk+zx0AS11p36HnD2ZKj/6JR5z27gSSULCNHIRReVs" crossorigin="anonymous">

<!-- The loading of KaTeX is deferred to speed up page rendering -->
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/katex.min.js" integrity="sha384-z1fJDqw8ZApjGO3/unPWUPsIymfsJmyrDVWC8Tv/a1HeOtGmkwNd/7xUS0Xcnvsx" crossorigin="anonymous"></script>

<!-- To automatically render math in text elements, include the auto-render extension: -->
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.15.1/dist/contrib/auto-render.min.js" integrity="sha384-+XBljXPPiv+OzfbB3cVmLHf4hdUFHlWNZN5spNQ7rmHTXpd7WvJum6fIACpNNfIR" crossorigin="anonymous"
    onload="renderMathInElement(document.body);"></script>

Let $$\text{PAR}$$ be the *par value* of a bond,
let $$T$$ be the years the bond matures in,
let $$C$$ be the *coupon* that the bond holder receives
every half-year (semiannually),
let $$r$$ be the *yield* per half-year.

Then $$C=\text{PAR} \times r$$ is how the value of each semiannual coupon and
the value of the bond when it is issued is:

$$
\text{PRICE} =
\underbrace{
    \sum_{t=1}^{2T} \frac{C}{(1+r)^t}
}_{\substack{\text{Present value} \\ \text{of all coupons}}} +
\underbrace{
    \frac{\text{PAR}}{(1+r)^{2T}}
}_{\substack{\text{Present value} \\ \text{of the par}}}
$$

Let's now see that the price of a coupon bond when it is issued is equal to its par value:

$$
\begin{equation*}
\begin{align*}
\text{PRICE}
%
& = \sum_{t=1}^{2T} \frac{C}{(1+r)^t} + \frac{\text{PAR}}{(1+r)^{2T}}
&& \text{Definition of price}
\\
%
& = C  \sum_{t=1}^{2T} \left(\frac{1}{1+r}\right)^t + \frac{\text{PAR}}{(1+r)^{2T}}
&& \text{Move $C$ outside the sum}
\\
%
& = \frac{C}{1+r}  \sum_{t=1}^{2T} \left(\frac{1}{1+r}\right)^{t-1} +
\frac{\text{PAR}}{(1+r)^{2T}}
&& \text{Move $\frac{1}{1+r}$ outside the sum}
\\
%
& = \frac{C}{1+r}  \frac{1 - \left(\frac{1}{1 + r}\right)^{2T}}{1-\left(\frac{1}{1+r}\right)} + \frac{\text{PAR}}{(1+r)^{2T}}
&& \text{Closed-form for geometric sum}
\\
%
& = C \frac{1 - \left(\frac{1}{1 + r}\right)^{2T}}{1 +r -1} + \frac{\text{PAR}}{(1+r)^{2T}}
&& \text{Simplify denominator}
\\
%
& = \frac{C}{r} \left(1 - \left(1 + r\right)^{-2T}\right) +
\text{PAR}(1+r)^{-2T}
&& \text{Simplify numerators}
\\
%
& = \frac{\text{PAR} \times r}{r} \left(1 - \left(1 + r\right)^{-2T}\right) +
\text{PAR}(1+r)^{-2T}
&& \text{Apply definition of coupon $C$}
\\
%
& = \text{PAR} \left(1 - \left(1 + r\right)^{-2T}\right) +
\text{PAR}(1+r)^{-2T}
&& \text{Simplify}
\\
%
&= \text{PAR} \; \square
\end{align*}
\end{equation*}
$$
