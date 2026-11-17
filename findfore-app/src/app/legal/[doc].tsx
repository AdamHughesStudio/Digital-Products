import { useLocalSearchParams } from 'expo-router';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Row, Screen, T, TopBar, styles as ui } from '@/components/ui';
import { colors, hair, hairline, radius, space } from '@/constants/theme';
import { LEGAL, type LegalDoc } from '@/constants/legal';

/**
 * The terms of use and privacy policy, read in the app. The text is written in Markdown in
 * legal-drafts/ and copied in by scripts/build-legal.py; this draws the few kinds of block it uses:
 * headings, paragraphs, bullet lists and tables.
 */

/** Bold runs, and the gaps still to fill in, shown plainly rather than as notes to ourselves */
function Inline({ text, variant = 'body', color }: { text: string; variant?: 'body' | 'small'; color?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[CONFIRM[^\]]*\])/g).filter(Boolean);
  return (
    <T variant={variant} color={color}>
      {parts.map((p, i) =>
        p.startsWith('**') ? (
          <T key={i} variant={variant === 'small' ? 'smallStrong' : 'bodyStrong'} color={color}>{p.slice(2, -2)}</T>
        ) : p.startsWith('[CONFIRM') ? (
          <T key={i} variant={variant} color={colors.textFaint}>(to be confirmed)</T>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </T>
  );
}

const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

function Block({ block }: { block: string }) {
  const lines = block.split('\n');
  // a heading with its text straight under it, no blank line between
  if (block.startsWith('#') && lines.length > 1) {
    return (
      <>
        <Block block={lines[0]} />
        <Block block={lines.slice(1).join('\n')} />
      </>
    );
  }
  if (block.startsWith('## ')) return <T variant="heading" style={{ marginTop: space.xl }} accessibilityRole="header">{block.slice(3)}</T>;
  if (block.startsWith('### ')) return <T variant="subheading" style={{ marginTop: space.md }} accessibilityRole="header">{block.slice(4)}</T>;

  if (lines.every((l) => l.startsWith('|'))) {
    const [head, , ...rows] = lines.map(cells);
    return (
      <View style={s.table}>
        {rows.map((r, i) => (
          <View key={i} style={[s.tableRow, i > 0 && s.tableRule]}>
            <Inline text={`**${r[0]}**`} />
            {r.slice(1).map((c, j) => (
              <Row key={j} gap={space.xs} style={{ marginTop: 2, alignItems: 'flex-start' }}>
                <T variant="small" color={colors.textMuted}>{head[j + 1]}:</T>
                <View style={{ flex: 1 }}><Inline text={c} variant="small" /></View>
              </Row>
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (lines[0].startsWith('- ')) {
    const items: string[] = [];
    for (const l of lines) {
      if (l.startsWith('- ')) items.push(l.slice(2));
      else items[items.length - 1] += ` ${l.trim()}`;
    }
    return (
      <View style={{ gap: space.sm }}>
        {items.map((it, i) => (
          <Row key={i} gap={space.sm} style={{ alignItems: 'flex-start' }}>
            <T variant="body" color={colors.textMuted}>•</T>
            <View style={{ flex: 1 }}><Inline text={it} /></View>
          </Row>
        ))}
      </View>
    );
  }

  return <Inline text={lines.map((l) => l.trim()).join(' ')} />;
}

export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const page = LEGAL[doc as LegalDoc];
  return (
    <View style={ui.screen}>
      <TopBar title={doc === 'privacy' ? 'Privacy policy' : 'Terms of use'} />
      <Screen>
        {!page ? (
          <EmptyState icon="document-text-outline" title="Page not found" body="Try Terms of use or Privacy policy from your profile." />
        ) : (
          <View style={{ gap: space.md, paddingBottom: space.xxl }}>
            <T variant="display">{page.title.replace(/^PlusFore /, '').replace(/^./, (c) => c.toUpperCase())}</T>
            {page.body.split(/\n\n+/).map((b, i) => <Block key={i} block={b} />)}
          </View>
        )}
      </Screen>
    </View>
  );
}

const s = StyleSheet.create({
  table: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: hair, borderColor: hairline, paddingHorizontal: space.lg },
  tableRow: { paddingVertical: space.md },
  tableRule: { borderTopWidth: hair, borderTopColor: hairline },
});
