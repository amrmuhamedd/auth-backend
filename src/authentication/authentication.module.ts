import { Module } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { User, UserSchema } from './entities/users.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRepository } from './repository/user.repository';
import { JwtModule } from '@nestjs/jwt';
import { Session, SessionSchema } from './entities/sessions.entity';
import { SessionsRepository } from './repository/sessions.repository';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategy/jwt.stratgy';

@Module({
  imports: [
    PassportModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
    JwtModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    JwtStrategy,
    UserRepository,
    SessionsRepository,
  ],
})
export class AuthenticationModule {}
