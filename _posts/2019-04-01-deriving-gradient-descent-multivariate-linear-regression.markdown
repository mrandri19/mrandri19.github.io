---
layout: post
title: "Deriving the gradient descent equations for multivariate linear regression"
author: andrea
---

<script type="text/x-mathjax-config">
MathJax.Hub.Config({
  tex2jax: {
    inlineMath: [['$','$'], ['\\(','\\)']],
    processEscapes: true
  }
});
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-AMS-MML_HTMLorMML" type="text/javascript"></script>

Multivariate linear regression (or general linear regression) is one of the main
building blocks of neural networks. It allows to approximate a linear function with
any number of inputs and outputs.

But, while reading the excellent [neural networks and deep learning](http://neuralnetworksanddeeplearning.com/chap1.html)
by Michael Nielsen I could not find a proof for the matrix version of these formulae.

In the book a generic cost function is given, whereas here we use mean squared error,
but extending it should be as simple as an additional [Hadamard product](https://en.wikipedia.org/wiki/Hadamard_product_(matrices)) before multiplying
by the transpose of $\mathbf x$.

Let $f: \mathbb R^{n} \to \mathbb R^{m}$, where:

$$f(\mathbf x)= A \mathbf x+ \mathbf b$$

and: $A \in \mathbb R^{m \times n}$, $\mathbf x \in \mathbb R^{n \times 1}$,
$\mathbf b \in \mathbb R^{m \times 1}$, $\mathbf y \in \mathbb R^{m \times 1}$

Let $C: \mathbb R^{m \times n} \times \mathbb R^m \to \mathbb R$, where

$$C(A,\mathbf b) = \frac{1}{2} \|f(\mathbf x) - \mathbf y\|^2$$

To apply gradient descent we need to do:

$$A' \leftarrow A - \eta \dfrac{\partial C(A,\mathbf b)}{\partial A}$$

How do we derive with respect to $A$ the cost function $C$?

$$
\dfrac{\partial C(A,\mathbf b)}{\partial A}
=
\frac{1}{2} \dfrac{\partial \|f(\mathbf x) - \mathbf y\|^2}{\partial A}
=
\frac{1}{2} \dfrac{\partial \| A \mathbf x+ \mathbf b- \mathbf y\|^2}{\partial A}
$$

Before deriving the norm, let's expand the inner term $A \mathbf x+ \mathbf b- \mathbf y$

$$
A\mathbf x + \mathbf b - \mathbf y =
\begin{bmatrix}
    a_{11}      & a_{12}      & \cdots &      a_{1n} \\
    a_{21}      & a_{22}      & \cdots &      a_{2n} \\
    \vdots      & \vdots      & \ddots &      \vdots \\
    a_{m1}      & a_{m2}      & \cdots &      a_{mn} \\
\end{bmatrix}
\begin{bmatrix}
    x_{1}  \\
    x_{2}  \\
    \vdots \\
    x_{n}  \\
\end{bmatrix}
+
\begin{bmatrix}
    b_{1}  \\
    b_{2}  \\
    \vdots \\
    b_{m}  \\
\end{bmatrix}
-
\begin{bmatrix}
    y_{1}  \\
    y_{2}  \\
    \vdots \\
    y_{m}  \\
\end{bmatrix}
$$

$$=
\begin{bmatrix}
    a_{11} x_1 + a_{12} x_2 + \cdots + a_{1n}x_n  \\
    a_{21} x_1 + a_{22} x_2 + \cdots + a_{2n}x_n  \\
    \vdots                                        \\
    a_{m1} x_1 + a_{m2} x_2 + \cdots + a_{mn}x_n  \\
\end{bmatrix}
+
\begin{bmatrix}
    b_{1}  \\
    b_{2}  \\
    \vdots \\
    b_{m}  \\
\end{bmatrix}
-
\begin{bmatrix}
    y_{1}  \\
    y_{2}  \\
    \vdots \\
    y_{m}  \\
\end{bmatrix}
$$

$$=
\begin{bmatrix}
    a_{11} x_1 + a_{12} x_2 + \cdots + a_{1n}x_n + b_1 - y_{1}  \\
    a_{21} x_1 + a_{22} x_2 + \cdots + a_{2n}x_n + b_2 - y_{2}  \\
    \vdots                                                      \\
    a_{m1} x_1 + a_{m2} x_2 + \cdots + a_{mn}x_n + b_m - y_{m}
\end{bmatrix}
$$

Then, using the definition of the l2 norm:

$$\| \mathbf x \|^2 = \sum_{k} x^2_k $$

we can obtain:

$$\| A \mathbf x+ \mathbf b- \mathbf y\|^2 = \sum_{k=1}^m (a_{k1} x_1 + a_{k2} x_2 + \cdots + a_{kn}x_n + b_k - y_{k})^2$$

Then, using the definition of a scalar derived by a matrix:

$$
\dfrac{\partial x}{\partial A}
=
\begin{bmatrix}
    \dfrac{\partial x}{\partial a_{11}}      & \dfrac{\partial x}{\partial a_{12}}      & \cdots &      \dfrac{\partial x}{\partial a_{1n}} \\
    \dfrac{\partial x}{\partial a_{21}}      & \dfrac{\partial x}{\partial a_{22}}      & \cdots &      \dfrac{\partial x}{\partial a_{2n}} \\
    \vdots                                   & \vdots                                   & \ddots &      \vdots                              \\
    \dfrac{\partial x}{\partial a_{m1}}      & \dfrac{\partial x}{\partial a_{m2}}      & \cdots &      \dfrac{\partial x}{\partial a_{mn}} \\
\end{bmatrix}
$$

we can calculate $\dfrac{\partial C}{\partial a_{11}}$: the first term of our matrix

$$
\frac{1}{2} \dfrac{\partial \| A \mathbf x+ \mathbf b- \mathbf y\|^2}{\partial a_{11}}
=
\frac{1}{2} \dfrac{\partial}{\partial a_{11}} \sum_{k=1}^m (a_{k1} x_1 + a_{k2} x_2 + \cdots + a_{kn}x_n + b_k - y_{k})^2
$$

$$=
\frac{1}{2} \dfrac{\partial}{\partial a_{11}} [
  (a_{11} x_1 + a_{12} x_2 + \cdots + a_{1n}x_n + b_1 - y_{1})^2 + \\
  (a_{21} x_1 + a_{22} x_2 + \cdots + a_{2n}x_n + b_2 - y_{2})^2 + \\
  \vdots                                                           \\
  (a_{m1} x_1 + a_{m2} x_2 + \cdots + a_{mn}x_n + b_m - y_{m})^2
]
$$

$$=
(a_{11} x_1 + a_{12} x_2 + \cdots + a_{1n}x_n + b_1 - y_{1})x_1
$$

In the same manner, we can obtain:

$$\dfrac{\partial C}{\partial a_{1j}} = (a_{11} x_1 + a_{12} x_2 + \cdots + a_{1n}x_n + b_1 - y_{1})x_j$$
$$\dfrac{\partial C}{\partial a_{21}} = (a_{21} x_1 + a_{22} x_2 + \cdots + a_{2n}x_n + b_2 - y_{2})x_1$$

arriving to the most general formula:

$$\dfrac{\partial C}{\partial a_{ij}} = (a_{i1} x_1 + a_{i2} x_2 + \cdots + a_{in}x_n + b_i - y_{i})x_j$$

which can be rewritten with a summation:

$$=\dfrac{\partial C}{\partial a_{ij}} = (\sum^n_{k=1} a_{ik}x_k + b_i - y_i)x_j$$

or a scalar product:

$$=
(\mathbf a_i \cdot \mathbf x + b_i - y_i)x_j
$$

where $a_i$ is the i-th row of the $A$ matrix and therefore has size $1 \times n$

Now let's write the complete $\dfrac{\partial C}{\partial A}$ matrix

$$
\dfrac{\partial C}{\partial A}
=
\begin{bmatrix}
    (\mathbf a_1 \cdot \mathbf x + b_1 - y_1) x_{1} & (\mathbf a_1 \cdot \mathbf x + b_1 - y_1) x_{2} & \cdots & (\mathbf a_1 \cdot \mathbf x + b_1 - y_1) x_{n}  \\
    (\mathbf a_2 \cdot \mathbf x + b_2 - y_2) x_{1} & (\mathbf a_2 \cdot \mathbf x + b_2 - y_2) x_{2} & \cdots & (\mathbf a_2 \cdot \mathbf x + b_2 - y_2) x_{n}  \\
    \vdots & \vdots & \ddots & \vdots                                                                                                                             \\
    (\mathbf a_m \cdot \mathbf x + b_m - y_m) x_{1} & (\mathbf a_m \cdot \mathbf x + b_m - y_m) x_{2} & \cdots & (\mathbf a_m \cdot \mathbf x + b_m - y_m) x_{n}  \\
\end{bmatrix}
$$

$$=
\begin{bmatrix}
    (\mathbf a_1 \cdot \mathbf x + b_1 - y_1) \mathbf x  \\
    (\mathbf a_2 \cdot \mathbf x + b_2 - y_2) \mathbf x  \\
    \vdots                                               \\
    (\mathbf a_m \cdot \mathbf x + b_m - y_m) \mathbf x  \\
\end{bmatrix}
=
\begin{bmatrix}
    (\mathbf a_1 \cdot \mathbf x + b_1 - y_1)  \\
    (\mathbf a_2 \cdot \mathbf x + b_2 - y_2)  \\
    \vdots                                     \\
    (\mathbf a_m \cdot \mathbf x + b_m - y_m)  \\
\end{bmatrix}
\begin{bmatrix}
    x_1 \cdots x_n
\end{bmatrix}
$$

$$=
(A \mathbf x + \mathbf b - \mathbf y) \mathbf x^\intercal
$$

The final formula is:

$$
\dfrac{\partial C}{\partial A} = (A \mathbf x + \mathbf b - \mathbf y) \mathbf x^\intercal
$$

In a similar manner we can derive:

$$
\dfrac{\partial C}{\partial \mathbf b} = (A \mathbf x + \mathbf b - \mathbf y)
$$
