import dotenv from 'dotenv'
dotenv.config({})

export enum BuildType {
  Production = 'prod',
  Development = 'dev',
  Test = 'test'
}

function getBuildType(env: NodeJS.ProcessEnv) {
  switch (env.BUILD_TYPE) {
    case 'prod':
      return BuildType.Production
    case 'dev':
      return BuildType.Development
    case 'test':
    default:
      return BuildType.Test
  }
}

const buildType = getBuildType(process.env)

export const config = {
  buildType,
  logLevel: 4,
  port: buildType === BuildType.Production ? 7331 : 7337,
  prettyPrint: true
}