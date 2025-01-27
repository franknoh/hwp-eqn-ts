import { Token, TokenType } from "./tokenTypes";

const HWP_KEYWORDS = new Set([
  "TIMES", "OVER", "ATOP", "SQRT",
  "INT", "OINT", "SUM",
  "MATRIX", "PMATRIX", "BMATRIX", "DMATRIX",
  "CASES",
  "ACUTE", "GRAVE", "DOT", "DDOT", "BAR", "VEC", "DYAD", "UNDER",
  "HAT", "ARCH", "CHECK", "TILDE"
]);

function isAlpha(ch: string) {
  return /^[A-Za-z]$/.test(ch);
}
function isDigit(ch: string) {
  return /^[0-9]$/.test(ch);
}

export class HwpEqnTokenizer {
  public static tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
      const ch = input[i];

      // 공백
      if (/\s/.test(ch)) {
        tokens.push({ type: TokenType.SPACE, value: ch });
        i++;
        continue;
      }

      // 기호
      if ("^_{}()#&~'/,.-+=*".includes(ch)) {
        tokens.push({ type: TokenType.SYMBOL, value: ch });
        i++;
        continue;
      }

      // 숫자
      if (isDigit(ch)) {
        let numStr = ch;
        i++;
        while (i < input.length && isDigit(input[i])) {
          numStr += input[i];
          i++;
        }
        tokens.push({ type: TokenType.NUMBER, value: numStr });
        continue;
      }

      // 알파벳(키워드 or 식별자)
      if (isAlpha(ch)) {
        let ident = ch;
        i++;
        while (i < input.length && isAlpha(input[i])) {
          ident += input[i];
          i++;
        }
        const upperIdent = ident.toUpperCase();
        if (HWP_KEYWORDS.has(upperIdent)) {
          tokens.push({ type: TokenType.KEYWORD, value: upperIdent });
        } else {
          tokens.push({ type: TokenType.IDENT, value: ident });
        }
        continue;
      }

      // 그 외
      tokens.push({ type: TokenType.UNKNOWN, value: ch });
      i++;
    }

    tokens.push({ type: TokenType.EOF, value: "" });
    return tokens;
  }
}
