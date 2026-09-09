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
import { ViewService } from './components/view/view.service';
import { SocketModule } from './socket/socket.module';
@Module({
  imports: [
    //--> env variablelarni oqish imkoniyatini beradi
    ConfigModule.forRoot(),
    GraphQLModule.forRoot(
      {
        driver: ApolloDriver,
        playground: true,
        uploads: false,
        autoSchemaFile: true, //generates the GraphQL schema from decorators.
        formatError: (error: T) => {
          const graphQLFormatError = { //This changes large GraphQL errors into smaller responses:
            code: error?.extensions.code,
            message: error?.extensions?.exception?.response?.message || error?.extensions?.response?.message || error?.message,
          };
          console.log("GraphQL Global Error:", graphQLFormatError);
          return graphQLFormatError;
        },
      }), //GraphQL API
    ComponentsModule, //HTTP
    DatabaseModule, SocketModule //TCP 
  ],
  // controller va providers remove qilsa boaldi,lekin test sifatida turibdi
  controllers: [AppController],
  providers: [AppService, AppResolver],
})

export class AppModule { }
