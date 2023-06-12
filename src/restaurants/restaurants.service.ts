import { Injectable } from '@nestjs/common';
import { Restaurant } from './entities/restaurant.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRestaurantDto } from './dtos/create-restaurant.dto';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}
  getAll(): Promise<Restaurant[]> {
    return this.restaurantRepository.find();
  }

  createRestaurant(restaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const newRestaurants = this.restaurantRepository.create(restaurantDto);
    return this.restaurantRepository.save(newRestaurants);
  }

  async updateRestaurant(
    id: number,
    restaurantDto: UpdateRestaurantDto,
  ): Promise<void> {
    await this.restaurantRepository.update(id, { ...restaurantDto });
  }
}
