import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { readFileSync } from 'fs';

export class CdkTemplateEksStackPrivate extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    const keyPair = this.node.tryGetContext('keyPair');
    const clusterName = this.node.tryGetContext('clusterName') ? this.node.tryGetContext('clusterName') : 'demo-eks-cluster-private';

    // Create VPC
    const vpc = new ec2.Vpc(this, 'vpc', {
      cidr: '10.99.0.0/16',
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 18,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 18,
          name: 'private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
        }
      ]
    });    

    // To create IAM role & assign it as EC2 instance role.
    const ec2role = new iam.Role(this, 'ec2role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ]
    });

    // Create EC2 Jumphost
    const instance = new ec2.Instance(this, 'instance', {
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      machineImage: new ec2.AmazonLinuxImage({
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
      }),
      keyName: keyPair,
      instanceName: `${clusterName}-jumphost`,
      role: ec2role
    });

    // To add EC2 user data
    const userdata = readFileSync('./lib/userdata.sh', 'utf8');
    instance.addUserData(userdata);

    // To add inbound security group rules
    instance.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    instance.connections.allowFromAnyIpv4(ec2.Port.icmpPing());

    // Create EKS Cluster
    const eksCluster = new eks.Cluster(this, 'eksClusterPrivate', {
      version: eks.KubernetesVersion.V1_21,
      clusterName,
      defaultCapacity: 0,
      albController: {
        version: eks.AlbControllerVersion.V2_3_0
      },
      endpointAccess: eks.EndpointAccess.PRIVATE,
      vpc
    });

    eksCluster.awsAuth.addMastersRole(ec2role);
    eksCluster.connections.allowDefaultPortFrom(instance);

    // add X86 node group
    eksCluster.addNodegroupCapacity('nodegroup', {
      instanceTypes: [new ec2.InstanceType('t3.large')],
      desiredSize: 1,
      minSize: 1,
      maxSize: 5,
      diskSize: 50,
      nodegroupName: `${clusterName}-nodegroup-1`
    });

    new CfnOutput(this, 'clusterName', {value: eksCluster.clusterName});
    new CfnOutput(this, 'vpcId', {value: vpc.vpcId});
    new CfnOutput(this, 'vpcCidr', {value: vpc.vpcCidrBlock});
    new CfnOutput(this, 'jumphost', {value: instance.instancePublicIp});
    new CfnOutput(this, 'jumphost-instance-id', {value: instance.instanceId});
    new CfnOutput(this, 'ec2roleArn', {value: ec2role.roleArn});

  }
}
