import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from "@nestjs/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriver } from "@nestjs/apollo"
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
@Module({
  imports: [
    //--> env variablelarni oqish imkoniyatini beradi
    ConfigModule.forRoot(),
    GraphQLModule.forRoot(
      {
        driver: ApolloDriver,
        playground: true,
        uploads: false,
        autoSchemaFile: true,
        formatError: (error: T) => {
          const graphQLFormatError = {
            code: error?.extensions.code,
            message: error?.extensions?.exception?.response?.message || error?.extensions?.response?.message || error?.message,
          };
          console.log("GraphQL Global Error:", graphQLFormatError);
          return graphQLFormatError;
        },
      }),
    ComponentsModule,
    DatabaseModule
  ],
  // controller va providers remove qilsa boaldi,lekin test sifatida turibdi
  controllers: [AppController],
  providers: [AppService, AppResolver],
})

export class AppModule { }
