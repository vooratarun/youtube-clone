import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { VideoCard } from './video.model';

type CategoryApiItem = string | { id?: number; name?: string; description?: string };
type CategoriesApiResponse = CategoryApiItem[] | { data?: CategoryApiItem[] };

export type CategoryOption = {
  id: number;
  name: string;
};

type CreateCategoryPayload = {
  name: string;
  description?: string;
};

type CategoryVideosResponse = {
  category?: {
    id: number;
    name: string;
    description?: string;
  };
  videos: VideoCard[];
};

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly categoriesApiUrl = 'http://localhost:3000/categories';

  getCategories(): Observable<CategoryOption[]> {
    return this.http.get<CategoriesApiResponse>(this.categoriesApiUrl).pipe(
      map((response) => {
        const categories = Array.isArray(response) ? response : response.data ?? [];
        return categories
          .map((category, index) => {
            if (typeof category === 'string') {
              const normalizedName = category.trim();
              return normalizedName ? { id: index + 1, name: normalizedName } : null;
            }

            const normalizedName = category?.name?.trim() ?? '';
            if (!normalizedName) {
              return null;
            }

            return {
              id: typeof category.id === 'number' ? category.id : index + 1,
              name: normalizedName
            };
          })
          .filter((category): category is CategoryOption => category !== null);
      })
    );
  }

  createCategory(payload: CreateCategoryPayload): Observable<CategoryOption> {
    return this.http.post<CategoryOption>(this.categoriesApiUrl, payload);
  }

  getVideosByCategory(categoryId: number): Observable<CategoryVideosResponse> {
    return this.http.get<CategoryVideosResponse>(`${this.categoriesApiUrl}/${categoryId}/videos`);
  }
}

