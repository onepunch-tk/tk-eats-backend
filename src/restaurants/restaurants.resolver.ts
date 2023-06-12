import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';
import { UsersService } from '../users/users.service';

@Resolver()
export class RestaurantsResolver {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly usersService: UsersService,
  ) {
    console.log(this.usersService.findUserById(2));
  }
  @Query((returns) => [Restaurant])
  restaurants(): Promise<Restaurant[]> {
    return this.restaurantsService.getAll();
  }
  @Mutation((returns) => Boolean)
  async createRestaurant(
    @Args('input')
    restaurantDto: CreateRestaurantDto,
  ): Promise<boolean> {
    try {
      await this.restaurantsService.createRestaurant(restaurantDto);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  @Mutation((returns) => Boolean)
  async updateRestaurant(
    @Args('id') id: number,
    @Args('data') restaurantDto: UpdateRestaurantDto,
  ) {
    try {
      await this.restaurantsService.updateRestaurant(id, restaurantDto);
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
}
