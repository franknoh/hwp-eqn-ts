import { Token } from "./tokenTypes";
import { tokenizeHwpEqn } from "./hwpTokenizer";
import { tokenizeLatex } from "./latexTokenizer";
import { ASTNode } from "./ast";
import { toLatex } from "./toLatex";
import { toHwpEqn } from "./toHwpEqn";

export class Tokenizer {

  /**
   * 정적 메서드: 토큰화
   * @param input - 입력 문자열
   * @param format - 'hwpeqn' 또는 'latex'
   */
  public static tokenize(input: string, format: 'latex' | 'hwpeqn'): Token[] {
      if (format === 'latex') {
          return tokenizeLatex(input);
      } else {
          return tokenizeHwpEqn(input);
      }
  }
  
  /**
   * 정적 메서드: 디코딩
   * @param ast - AST 노드
   * @param format - 'hwpeqn' 또는 'latex'
   */
  public static decode(ast: ASTNode, format: 'latex' | 'hwpeqn'): string {
      if (format === 'latex') {
          return toLatex(ast).trim();
      } else {
          return toHwpEqn(ast).trim();
      }
  }
}