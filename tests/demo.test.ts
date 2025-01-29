import { Tokenizer, Parser } from "../src";
import { Token, ASTNode } from "../src";

const latexInput = `
x \\times 3 + \\frac{y^{2}}{z} + \\int_{1}^{2} {x^{3}} + \\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix} + \\begin{cases} x = 1 \\\\ y = 2 \\end{cases} + \\acute{A} + \\sqrt{x} + f \\left( \\frac{x}{y} \\right) + g(x)
`.trim();

const hwpeqnInput = `
x times 3 + y^2 over z + int_1^2 { { x^3 } } + pmatrix{1 & 2 # 3 & 4} + cases{x = 1 # y = 2} + acute A + sqrt x + f LEFT( x over y RIGHT) + g(x)
`.trim();



describe("LaTeX -> AST -> LaTeX & 한컴수식", () => {
    // 1) 토큰화
    let tokens: Token[] = [];
    it("should tokenize", () => {
        tokens = Tokenizer.tokenize(latexInput, "latex");
        expect(tokens).toBeDefined();
    });

    // 2) 파싱 → AST
    let ast: ASTNode = { type: "" };
    it("should parse", () => {
        ast = Parser.parseExpression(tokens, 'latex');
        expect(ast).toBeDefined();
    });

    // 3) AST → LaTeX
    it("should convert to LaTeX", () => {
        const latex = Tokenizer.decode(ast, 'latex');
        expect(latex).toEqual(latexInput);
    });

    // 4) AST → 한컴수식
    it("should convert to 한컴수식", () => {
        const hwp = Tokenizer.decode(ast, 'hwpeqn');
        expect(hwp).toEqual(hwpeqnInput);
    });
});


describe("한컴수식 -> AST -> LaTeX & 한컴수식", () => {
    // 1) 토큰화
    let tokens: Token[] = [];
    it("should tokenize", () => {
        tokens = Tokenizer.tokenize(hwpeqnInput, "hwpeqn");
        expect(tokens).toBeDefined();
    });

    // 2) 파싱 → AST
    let ast: ASTNode = { type: "" };
    it("should parse", () => {
        ast = Parser.parseExpression(tokens, "hwpeqn");
        expect(ast).toBeDefined();
    });

    // 3) AST → LaTeX
    it("should convert to LaTeX", () => {
        const latex = Tokenizer.decode(ast, 'latex');
        expect(latex).toEqual(latexInput);
    });

    // 4) AST → 한컴수식
    it("should convert to 한컴수식", () => {
        const hwp = Tokenizer.decode(ast, 'hwpeqn');
        expect(hwp).toEqual(hwpeqnInput);
    });
});