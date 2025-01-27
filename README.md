# 🌟 HwpLatex Parser

> **한글(HWP) 수식**과 **LaTeX**를 상호 변환하고,  
> **AST**(Abstract Syntax Tree) 형태로 조작할 수 있는 TypeScript 라이브러리입니다.  

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" />
  <img src="https://img.shields.io/badge/License-MIT-green.svg" />
</p>

## 🍀 소개 (Introduction)

**HwpLatex Parser**는 다음과 같은 기능을 제공합니다:

1. **토큰화** (Tokenizing)  
   - `hwpeqn` 문법(한글 수식) → 토큰 배열  
   - `latex` 문법(LaTeX) → 토큰 배열  

2. **파싱** (Parsing)  
   - 문법별 전용 파서를 통해 **공통 AST**를 생성  
   - `int_1^2` / `\int_{1}^2` / `pmatrix{...}` / `\begin{pmatrix}...\end{pmatrix}` 등 지원  

3. **코드 변환** (Decoding)  
   - 공통 AST → 한글 수식 문법(`hwpeqn`)  
   - 공통 AST → LaTeX 문법(`latex`)  

4. **불필요한 괄호/중첩**을 자동으로 완화 (Flattening)  
   - 예: 중첩된 `{ { ... } }` → `{ ... }`  

\(\Rightarrow\) **한글(HWP) 수식**과 **LaTeX** 간 상호 변환을 유연하게 해주는 라이브러리입니다.  
 
---

## 📦 설치 (Installation)

```bash
npm install hwp-eqn-ts
# 또는
yarn add hwp-eqn-ts
```

---

## ⚙️ 사용 방법 (Usage)

```ts
import { Tokenizer, Parser } from "hwp-eqn-ts"; 

// 1) 한글(HWP) 수식 예시
const hwpeqnInput = `
  x times 3 + y^2 over z + int_1^2 { x^3 }
  + pmatrix{1 & 2 # 3 & 4}
  + cases { x=1 # y=2 }
`;

// 1-1) 토큰화
const hwpTokens = Tokenizer.tokenize(hwpeqnInput, "hwpeqn");

// 1-2) 파싱 -> AST
const hwpAst = Parser.parseExpression(hwpTokens, "hwpeqn");

// 1-3) AST -> LaTeX
const latexStr = Tokenizer.decode(hwpAst, "latex")
console.log("Converted to LaTeX:\n", latexStr);

// 2) LaTeX 예시
const latexInput = String.raw`
  x \times 3 + \frac{y^2}{z} + \int_{1}^{2} {x^3}
  + \pmatrix{1 & 2 \\ 3 & 4} + \begin{cases} x=1 \\ y=2 \end{cases}
`;

// 2-1) 토큰화
const latexTokens = Tokenizer.tokenize(latexInput, "latex");

// 2-2) 파싱 -> AST
const latexAst = Parser.parseExpression(latexTokens, "latex");

// 2-3) AST -> 한글(HWP) 수식
const hwpEqnStr = Tokenizer.decode(latexAst, "hwpeqn")
console.log("Converted back to HWP:\n", hwpEqnStr);
```

---

## 📄 라이선스 (License)

이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.  
자유롭게 사용, 수정, 배포하실 수 있습니다.