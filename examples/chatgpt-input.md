这个其实是 **语言模型的 softmax / cross-entropy 目标 +** **`z-loss`** **正则项**。

### 1. (U\_r(x)) 是什么？

假设模型输入上下文 (x)，最后输出 vocabulary 上的 logits：

[
U(x)=
[U\_1(x),U\_2(x),\dots,U\_{|V|}(x)]
]

其中 (r) 是正确 token 的编号。

# [ P(r\mid x)

\frac{e^{U\_r(x)}}
{\sum\_{r'=1}^{|V|}e^{U\_{r'}(x)}}.
]

这里定义

[
\boxed{
Z(x)=\sum\_{r'=1}^{|V|}e^{U\_{r'}(x)}
}
]

# [ \log P(r\mid x)

U\_r(x)-\log Z(x).
]

代码内容不能被改：`U\_r(x)`。

```python
example = "[\nU\\_r(x)\n]"
```
