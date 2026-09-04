import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); //EXPRESS + NEST 
  //Global integratsiya
  app.useGlobalPipes(new ValidationPipe()) //DTO(pipe validation)
  app.useGlobalInterceptors(new LoggingInterceptor()); //Interceptorlar validation (logging standardlari)
  app.enableCors({ origin: true, credentials: true }); //cors integratsiya(hamma joydan requestlarni serverimiz qabul qila olishi uchun)
  app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 })); //serverimizga file yuklash(15MB)
  app.use('/uploads', express.static('./uploads')); //uploads fileni tashqi olamga ochiqlayapmiz
  await app.listen(process.env.PORT_API ?? 3001);
}
bootstrap();

//pipe validation turlari:Global, resolver va controller, metodlar