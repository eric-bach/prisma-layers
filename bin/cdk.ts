#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { MembershipFoundationsStack } from '../lib/backend-stack';

const app = new App();

new MembershipFoundationsStack(app, `epic-docker-build-stack`, {});
