'use client';

import { ConfigProvider, App, theme } from 'antd';
import { StyleProvider } from '@ant-design/cssinjs';

export default function AntdProviders({ children }: { children: React.ReactNode }) {
  return (
    <StyleProvider>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
