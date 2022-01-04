import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Ec2Action } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Cluster } from 'aws-cdk-lib/aws-ecs';
import { DefaultCapacityType } from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';

export class CdkTemplateEksStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const eksCluster = new eks.Cluster(this, 'eksCluster', {
      version: eks.KubernetesVersion.V1_21,
      clusterName: 'cgkdemo',
      defaultCapacity: 0,
      albController: {
        version: eks.AlbControllerVersion.V2_3_0
      }
    });

    const awsAuth = new eks.AwsAuth(this, 'myAuth', {
        cluster: eksCluster
    });
    const user = iam.User.fromUserArn(this, 'userarn', 'arn:aws:iam::916049748016:user/tirtawid');
    awsAuth.addUserMapping(user, {groups: ['system:masters']});
    const user2 = iam.User.fromUserArn(this, 'userarn2', 'arn:aws:iam::916049748016:user/rbac-user');
    awsAuth.addUserMapping(user2, {groups: ['system:masters']});

    // add X86 node group
    eksCluster.addNodegroupCapacity('nodegroup-x86', {
      instanceTypes: [new ec2.InstanceType('t3.medium')],
      maxSize: 20,
      diskSize: 100,
      nodegroupName: 'nodegroup-x86'
    });

    // add X86 node group
    eksCluster.addNodegroupCapacity('nodegroup-x86-large', {
        instanceTypes: [new ec2.InstanceType('t3.large')],
        maxSize: 20,
        diskSize: 100,
        nodegroupName: 'nodegroup-x86-large',
        tags: {
            'nodetype': 'xlarge',
            'applicationtype': 'critical'
        }
    });
    
    // // add ARM node group
    // eksCluster.addNodegroupCapacity('nodegroup-arm', {
    //   instanceTypes: [new ec2.InstanceType('t4g.large')],
    //   minSize: 1,
    //   maxSize: 4,
    //   diskSize: 100,
    //   amiType: eks.NodegroupAmiType.AL2_ARM_64,
    //   nodegroupName: 'nodegroup-arm'
    // });

    eksCluster.addManifest('namespace', {
      "apiVersion": "v1",
      "kind": "Namespace",
      "metadata": {
          "name": "kambing"
      }  
    });

    eksCluster.addManifest('deployment', {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {
          "name": "app1-deployment",
          "namespace": "kambing",
          "labels": {
              "app": "app1"
          }
      },
      "spec": {
          "replicas": 10,
          "selector": {
              "matchLabels": {
                  "app": "app1"
              }
          },
          "template": {
              "metadata": {
                  "labels": {
                      "app": "app1"
                  }
              },
              "spec": {
                  "containers": [
                      {
                          "name": "testapp1",
                          "image": "tedytirta/testcgk",
                          "imagePullPolicy": "Always",
                          "ports": [
                              {
                                  "containerPort": 8080
                              }
                          ]
                      }
                  ],
                  "nodeSelector": {
                      "kubernetes.io/arch": "amd64"
                  }
              }
          }
      }  
    });

    eksCluster.addManifest('service', {
      "apiVersion": "v1",
      "kind": "Service",
      "metadata": {
          "name": "app1-service",
          "namespace": "kambing",
          "labels": {
              "app": "app1"
          }
      },
      "spec": {
          "selector": {
              "app": "app1"
          },
          "type": "NodePort",
          "ports": [
              {
                  "name": "http",
                  "protocol": "TCP",
                  "port": 80,
                  "targetPort": 8080
              }
          ]
      }  
    });

    eksCluster.addManifest('ingress', {
      "apiVersion": "networking.k8s.io/v1",
      "kind": "Ingress",
      "metadata": {
          "name": "kambing-app1-ingress",
          "namespace": "kambing",
          "annotations": {
              "kubernetes.io/ingress.class": "alb",
              "alb.ingress.kubernetes.io/scheme": "internet-facing",
              "alb.ingress.kubernetes.io/listen-ports": "[{\"HTTP\":80}]"
          }
      },
      "spec": {
          "rules": [
              {
                  "http": {
                      "paths": [
                          {
                              "path": "/app1",
                              "pathType": "Prefix",
                              "backend": {
                                  "service": {
                                      "name": "app1-service",
                                      "port": {
                                          "number": 80
                                      }
                                  }
                              }
                          },
                          {
                              "path": "/",
                              "pathType": "Exact",
                              "backend": {
                                  "service": {
                                      "name": "app1-service",
                                      "port": {
                                          "number": 80
                                      }
                                  }
                              }
                          }
                      ]
                  }
              }
          ]
      }  
    });

    new CfnOutput(this, 'clusterName', {value: eksCluster.clusterName});
    new CfnOutput(this, 'vpcId', {value: eksCluster.vpc.vpcId});
    new CfnOutput(this, 'vpcCidr', {value: eksCluster.vpc.vpcCidrBlock});

  }
}
