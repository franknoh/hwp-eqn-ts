import { Token } from "./tokenTypes";
import { HwpParser } from "./hwpParser";
import { LatexParser } from "./latexParser";
import { ASTNode } from "./ast";

export class Parser {
  /**
   * 정적 메서드: 파싱
   * @param tokens - 토큰 배열
   * @param format - 'hwpeqn' 또는 'latex'
   */
  public static parseExpression(tokens: Token[], format: 'hwpeqn' | 'latex'): ASTNode {
    if (format === 'hwpeqn') {
      const p = new HwpParser(tokens);
      return p.parseExpression();
    } else {
      const p = new LatexParser(tokens);
      return p.parseExpression();
    }
  }
}
