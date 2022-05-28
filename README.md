# Epic Docker Build

This repo provides an example on how to build the source for an AWS Lambda Layer using Docker with a Dockerfile. The built assets are then deployed to AWS as a Lambda Layer.

Docker Desktop is required on the local system for this build.

# Getting Started

1. Install CDK dependencies

   ```bash
   npm install
   ```

2. Install Lambda dependencies

   ```bash
   cd /src/lambda/userService && npm install
   ```

3. Install Prisma Layer dependencies

   ```bash
   cd /src/lambda/userService && PRISMA_CLI_BINARY_TARGETS=rhel-openssl-1.0.x npm install
   ```

4. Build and deploy CDK

   ```
   npm run build && cdk deploy --all --require-approval never --profile AWS_PROFILE_NAME
   ```

# Running interactive terminal in the AWS Lambda container image

AWS Lambda container image - https://gallery.ecr.aws/lambda/nodejs

1. Get the public image

   ```
   docker pull public.ecr.aws/lambda/nodejs:14
   ```

2. Get the image ID

   ```
   docker image ls
   ```

3. Run the image with a mount to local disk

   ```
   docker run -v /c/AMAABCA:/tmp -it --entrypoint sh IMAGE_ID
   ```
