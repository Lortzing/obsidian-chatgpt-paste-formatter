你这里本质上是 RMSProp：

[
S_W=\beta S_W+(1-\beta)g_W^2
]

然后

[
W_{t+1}
=======

W_t-r\frac{g_W}{\sqrt{S_W+\epsilon}}
]

关键是这两个量职责不同：

[
g_W
]

决定**方向**；

[
\sqrt{S_W}
]

决定**缩放大小**。

---

假设一维情况，当前梯度是

[
g_W=-10
]

这表示 loss 要下降，参数应该往正方向更新，因为普通 SGD 是

[
W_{t+1}=W_t-rg_W
================

W_t+10r.
]

而

[
S_W\approx g_W^2=100,
\qquad
\sqrt{S_W}=10.
]

RMSProp 更新变成

[
\Delta W
========

# -r\frac{-10}{10}

+r.
]

方向仍然由 (g_W<0) 决定，只是把原本过大的步长 (10r) 归一化到了 (r) 左右。

---

如果按照你说的：

[
W_{t+1}
=======

W_t-r\sqrt{S_W+\epsilon}
]

那么

[
\sqrt{S_W+\epsilon}>0
]

永远是正数，于是：

[
\Delta W<0
]

**无论梯度是正还是负，参数都会一直减小。**

例如：

[
g=+10
]

你更新：

[
W\leftarrow W-10r
]

方向是对的。

但如果：

[
g=-10
]

你仍然：

[
W\leftarrow W-10r
]

这时方向就完全错了。

所以至少必须保留：

[
\operatorname{sign}(g)
]

的信息。

---

更深一层看，RMSProp 做的是：

[
\boxed{
\frac{g_t}{\sqrt{E[g^2]}}
}
]

其中

[
S_t\approx E[g^2].
]

如果最近梯度尺度大约一直是：

[
g\sim 100
]

那么

[
\sqrt S\sim100,
]

于是：

[
\frac g{\sqrt S}
\sim1.
]

如果另一个参数梯度一直只有：

[
g\sim0.01,
]

那么

[
\sqrt S\sim0.01,
]

仍然：

[
\frac g{\sqrt S}
\sim1.
]

所以 RMSProp 的目的其实是：

[
\boxed{\text{用历史梯度 RMS 对当前梯度做归一化}}
]

而不是“把历史梯度大小直接拿来更新参数”。

---

你也可以把它理解成一个**逐参数自适应学习率**：

[
W_{t+1}
=======

W_t-
\underbrace{
\frac{r}{\sqrt{S_W+\epsilon}}
}_{\text{effective learning rate}}
g_W.
]

也就是说真正的学习率变成：

[
\boxed{
r_{\text{eff}}
==============

\frac r{\sqrt{S_W+\epsilon}}
}
]

如果某个参数过去梯度一直很大：

[
S_W\uparrow
\quad\Rightarrow\quad
r_{\text{eff}}\downarrow
]

步子自动变小。

如果过去梯度一直很小：

[
S_W\downarrow
\quad\Rightarrow\quad
r_{\text{eff}}\uparrow
]

步子相对变大。

所以整个逻辑是：

[
\boxed{
\text{update}
=============

-\text{learning rate}
\times
\frac{\text{当前梯度}}
{\text{历史梯度尺度}}
}
]

而不是

[
-\text{learning rate}\times\text{历史梯度尺度}.
]

这一步理解清楚以后，Adam 就很自然了：**RMSProp 的分母 (\sqrt{S_t}) 保留下来，再把分子的当前梯度 (g_t) 换成 momentum (m_t)**：

[
\boxed{
\Delta\theta_{\text{Adam}}
==========================

-\eta
\frac{m_t}{\sqrt{v_t}+\epsilon}
}
]

也就是“**方向用一阶矩，尺度用二阶矩**”。


`logsumexp(U)` 就是：

[
\boxed{
\operatorname{logsumexp}(U)
===========================

\log\left(\sum_i e^{U_i}\right)
}
]

如果

[
U=[u_1,u_2,\dots,u_n]
]

那么：

[
\operatorname{logsumexp}(U)
===========================

\log\left(
e^{u_1}+e^{u_2}+\cdots+e^{u_n}
\right).
]

它其实就是你刚才公式里的：

[
\boxed{\log Z}
]

因为

[
Z=\sum_i e^{U_i}.
]

所以：

[
\log Z
======

\operatorname{logsumexp}(U).
]

---

例如：

[
U=[1,2,3]
]

则：

[
\operatorname{logsumexp}(U)
===========================

\log(e^1+e^2+e^3).
]

数值大约：

[
=\log(2.718+7.389+20.086)
]

[
=\log(30.193)
\approx3.4076.
]

---
