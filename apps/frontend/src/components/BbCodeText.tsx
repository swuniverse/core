import type { ReactNode } from 'react';

export type BbCodeTextProps = {
  text: string | null | undefined;
  className?: string;
  as?: 'div' | 'p' | 'span';
};

type Tag = 'b' | 'i' | 'u' | 's' | 'quote' | 'code' | 'url';

type Part = {
  literal: string;
  node: ReactNode;
};

type Frame = {
  tag: Tag;
  attr: string | undefined;
  startLiteral: string;
  children: Part[];
};

const TAG_PATTERN = /\[(\/?)(b|i|u|s|quote|code|url)(?:=([^\]]+))?\]/gi;

function textPart(text: string): Part {
  return { literal: text, node: text };
}

function partsLiteral(parts: Part[]): string {
  let literal = '';
  for (const part of parts) literal += part.literal;
  return literal;
}

function partsNodes(parts: Part[]): ReactNode[] {
  return parts.map((part) => part.node);
}

function isSafeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function appendPart(stack: Frame[], root: Part[], part: Part) {
  const parent = stack.at(-1)?.children ?? root;
  parent.push(part);
}

function renderFrame(frame: Frame, endLiteral: string, nextKey: () => string): Part {
  const literal = `${frame.startLiteral}${partsLiteral(frame.children)}${endLiteral}`;
  const children = partsNodes(frame.children);

  switch (frame.tag) {
    case 'b':
      return { literal, node: <strong key={nextKey()}>{children}</strong> };
    case 'i':
      return { literal, node: <em key={nextKey()}>{children}</em> };
    case 'u':
      return { literal, node: <span key={nextKey()} className="underline">{children}</span> };
    case 's':
      return { literal, node: <span key={nextKey()} className="line-through">{children}</span> };
    case 'quote':
      return {
        literal,
        node: <blockquote key={nextKey()} className="border-l-2 border-swu-border/70 pl-3 my-2 text-swu-muted/90">{children}</blockquote>,
      };
    case 'code':
      return {
        literal,
        node: <code key={nextKey()} className="block whitespace-pre-wrap rounded border border-swu-border/60 bg-swu-bg/70 px-2 py-1 font-mono text-[0.95em] text-swu-primary">{partsLiteral(frame.children)}</code>,
      };
    case 'url': {
      const href = frame.attr ?? partsLiteral(frame.children).trim();
      if (!isSafeUrl(href)) return textPart(literal);

      return {
        literal,
        node: <a key={nextKey()} href={href} target="_blank" rel="noreferrer" className="text-swu-accent underline hover:text-swu-primary">{children}</a>,
      };
    }
  }
}

function parseBbCode(text: string): ReactNode[] {
  const root: Part[] = [];
  const stack: Frame[] = [];
  let lastIndex = 0;
  let keyCounter = 0;
  const nextKey = () => `bbcode-${keyCounter++}`;

  TAG_PATTERN.lastIndex = 0;

  for (let match = TAG_PATTERN.exec(text); match; match = TAG_PATTERN.exec(text)) {
    const [token, closingSlash, rawTag, attr] = match;
    const tokenIndex = match.index;

    if (tokenIndex > lastIndex) appendPart(stack, root, textPart(text.slice(lastIndex, tokenIndex)));

    const tag = rawTag.toLowerCase() as Tag;
    const top = stack.at(-1);

    if (top?.tag === 'code' && !(closingSlash && tag === 'code')) {
      appendPart(stack, root, textPart(token));
    } else if (closingSlash) {
      if (top?.tag === tag) {
        const frame = stack.pop()!;
        appendPart(stack, root, renderFrame(frame, token, nextKey));
      } else {
        appendPart(stack, root, textPart(token));
      }
    } else {
      stack.push({ tag, attr, startLiteral: token, children: [] });
    }

    lastIndex = TAG_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) appendPart(stack, root, textPart(text.slice(lastIndex)));

  while (stack.length > 0) {
    const frame = stack.pop()!;
    appendPart(stack, root, textPart(`${frame.startLiteral}${partsLiteral(frame.children)}`));
  }

  return partsNodes(root);
}

export function BbCodeText({ text, className, as = 'div' }: BbCodeTextProps) {
  const Component = as;

  return <Component className={className}>{parseBbCode(text ?? '')}</Component>;
}
