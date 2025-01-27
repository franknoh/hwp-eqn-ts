import { Token } from "./tokenTypes";
import { HwpEqnTokenizer } from "./hwpEqnTokenizer";
import { LatexTokenizer } from "./latexTokenizer";
import { ASTNode } from "./ast";
import { toLatex } from "./toLatex";
import { toHwpEqn } from "./toHwpEqn";

export class Tokenizer {

  /**
   * 정적 메서드: 토큰화
   * @param input - 입력 문자열
   * @param format - 'hwpeqn' 또는 'latex'
   */
  public static tokenize(input: string, format: 'hwpeqn' | 'latex'): Token[] {
    if (format === 'hwpeqn') {
      return HwpEqnTokenizer.tokenize(input);
    } else {
      return LatexTokenizer.tokenize(input);
    }
  }

  /**
   * 정적 메서드: 디코딩
   * @param ast - AST 노드
   * @param format - 'hwpeqn' 또는 'latex'
   */
  public static decode(ast: ASTNode, format: 'hwpeqn' | 'latex'): string {
    if (format === 'hwpeqn') {
      return toHwpEqn(ast);
    } else {
      return toLatex(ast);
    }
  }
}
