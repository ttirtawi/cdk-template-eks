#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkTemplateEksStackPublic } from '../lib/cdk-template-eks-stack-public';
import { CdkTemplateEksStackPrivate } from '../lib/cdk-template-eks-stack-private';

const app = new cdk.App();
new CdkTemplateEksStackPrivate(app, 'eksStackPrivate', {
  description: 'demo eks private cluster',
  env: { account: '916049748016', region: 'ap-southeast-3' },
});
new CdkTemplateEksStackPublic(app, 'eksStackPublic', {
  description: 'demo eks public cluster',
  env: { account: '916049748016', region: 'ap-southeast-3' },
});