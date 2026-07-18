import React from 'react';
import { Result } from 'antd';

export function NotFound() {
  return <Result status="404" title="404" subTitle="Page not found." />;
}
