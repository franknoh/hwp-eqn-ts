import { Token, TokenType } from "./tokenTypes";

const LATEX_KEYWORDS = new Set([
  "int", "oint", "sum", "sqrt", "frac",
  "matrix", "pmatrix", "bmatrix", "vmatrix",
  "cases",
  "acute", "grave", "dot", "ddot", "bar", "vec", "hat", "tilde",
  "times",
  "begin", "end" // 환경
]);

function isAlpha(ch: string) {
  return /^[A-Za-z]$/.test(ch);
}
function isDigit(ch: string) {
  return /^[0-9]$/.test(ch);
}

export class LatexTokenizer {
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

      // 특수 기호 처리: ^, _, {, }, \, (, ), +, -, /, etc.
      if ("^_{}()#&~'/,.-+*=|[]\\".includes(ch)) {
        if (ch === "\\") {
          // \begin, \int, \\, ...
          i++;
          if (i < input.length && input[i] === "\\") {
            // "\\" => 줄바꿈
            tokens.push({ type: TokenType.SYMBOL, value: "\\\\" });
            i++;
            continue;
          } else {
            let cmd = "";
            while (i < input.length && isAlpha(input[i])) {
              cmd += input[i];
              i++;
            }
            const lowerCmd = cmd.toLowerCase();
            if (cmd.length > 0) {
              if (LATEX_KEYWORDS.has(lowerCmd)) {
                tokens.push({ type: TokenType.KEYWORD, value: lowerCmd });
              } else {
                // 미등록 => IDENT
                tokens.push({ type: TokenType.IDENT, value: cmd });
              }
            } else {
              // \ 자체
              tokens.push({ type: TokenType.SYMBOL, value: "\\" });
            }
          }
        } else {
          // 일반 기호
          tokens.push({ type: TokenType.SYMBOL, value: ch });
          i++;
        }
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

      // 알파벳
      if (isAlpha(ch)) {
        let ident = ch;
        i++;
        while (i < input.length && isAlpha(input[i])) {
          ident += input[i];
          i++;
        }
        tokens.push({ type: TokenType.IDENT, value: ident });
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
