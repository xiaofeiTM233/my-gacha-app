'use client';

import { ConfigProvider, App, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { StyleProvider } from '@ant-design/cssinjs';

export default function AntdProviders({ children }: { children: React.ReactNode }) {
  return (
    <StyleProvider>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
            colorBgBase: '#1a1a1f',
            colorBgLayout: '#1a1a1f',
            colorBgContainer: '#22222a',
            colorBgElevated: '#27272f',
          },
          components: {
            Layout: {
              headerBg: '#1a1a1f',
              bodyBg: '#1a1a1f',
            },
          },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </StyleProvider>
  );
}
