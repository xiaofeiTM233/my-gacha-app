'use client';

import { StyleProvider } from '@ant-design/cssinjs';

export default function AntdProviders({ children }: { children: React.ReactNode }) {
  return <StyleProvider>{children}</StyleProvider>;
}
