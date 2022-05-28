import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, FunctionUrl, FunctionUrlAuthType, Runtime, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { InstanceClass, InstanceSize, InstanceType, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';

import * as path from 'path';
import { AuroraPostgresEngineVersion, DatabaseCluster, DatabaseClusterEngine } from 'aws-cdk-lib/aws-rds';

export class PrismaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, `Vpc`, {
      vpcName: 'EpicVpc',
    });

    const securityGroup = new SecurityGroup(this, `SecurityGroup`, {
      vpc,
      securityGroupName: 'EpicSecurityGroup',
    });

    const cluster = new DatabaseCluster(this, `Cluster`, {
      defaultDatabaseName: 'EpicDatabase',
      engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_13_6 }),
      instanceProps: {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnets: vpc.isolatedSubnets.concat(vpc.privateSubnets) }),
        instanceType: InstanceType.of(InstanceClass.T3, InstanceSize.MEDIUM),
        securityGroups: [securityGroup],
      },
      instances: 1,
      storageEncrypted: true,
    });

    const prismaLayer = new LayerVersion(this, 'PrismaLayer', {
      compatibleRuntimes: [Runtime.NODEJS_16_X],
      description: 'Prisma Layer',
      code: Code.fromAsset(path.join(__dirname, '../src/layers/prisma'), {
        bundling: {
          image: Runtime.NODEJS_16_X.bundlingImage,
          command: [
            'bash',
            '-c',
            [
              'cp package.json package-lock.json client.js /asset-output',
              'cp -r prisma /asset-output/prisma',
              'cp -r node_modules /asset-output/node_modules',
              'rm -rf /asset-output/node_modules/.cache',
              'rm -rf /asset-output/node_modules/@prisma/engines/node_modules',
              'rm -rf /asset-output/node_modules/@prisma/*darwin*',
              'rm -rf /asset-output/node_modules/@prisma/*windows*',
              'rm -rf /asset-output/node_modules/prisma/*darwin*',
              'rm -rf /asset-output/node_modules/prisma/*windows*',
              'npx prisma generate',
            ].join(' && '),
          ],
        },
      }),
      layerVersionName: `prisma-layer`,
    });

    const userService = new Function(this, 'UserService', {
      functionName: `user-service`,
      runtime: Runtime.NODEJS_16_X,
      handler: 'main.handler',
      code: Code.fromAsset(path.join(__dirname, '../src/lambda/userService')),
      vpc: vpc,
      layers: [prismaLayer],
      environment: {
        REGION: Stack.of(this).region,
      },
      memorySize: 512,
      timeout: Duration.seconds(10),
    });

    const userFunctionUrl = new FunctionUrl(this, 'UserServiceUrl', {
      function: userService,
      authType: FunctionUrlAuthType.NONE,
    });

    new CfnOutput(this, 'VpcId', { value: vpc.vpcId });
    new CfnOutput(this, 'securityGroupId', { value: securityGroup.securityGroupId });
    new CfnOutput(this, 'clusterHostname', { value: cluster.clusterEndpoint.hostname });
    new CfnOutput(this, 'PrismaLayerVersionArn', { value: prismaLayer.layerVersionArn });
    new CfnOutput(this, 'UserFunctionArn', { value: userService.functionArn });
    new CfnOutput(this, 'UserFunctionUrl', { value: userFunctionUrl.url });
  }
}
