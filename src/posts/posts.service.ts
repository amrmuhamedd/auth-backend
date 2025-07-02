import { Injectable } from '@nestjs/common';

@Injectable()
export class PostsService {
  private readonly posts = [
    {
      id: 1,
      title: 'Understanding JavaScript Closures',
      content:
        'Closures allow functions to remember the scope in which they were created...',
      author: 'John Doe',
      createdAt: '2025-03-29T12:00:00Z',
    },
  ];

  findAll() {
    return this.posts;
  }
}
