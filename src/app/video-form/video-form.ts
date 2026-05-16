import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { CategoryOption, CategoryService } from '../category.service';
import { VideoCard, VideoUploadPayload } from '../video.model';

@Component({
  selector: 'app-video-form',
  imports: [ReactiveFormsModule],
  templateUrl: './video-form.html',
  styleUrl: './video-form.css'
})
export class VideoFormComponent implements OnChanges, OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);

  @Input() isSubmitting = false;
  @Input() resetKey = 0;
  @Input() isEditMode = false;
  @Input() initialData: Partial<VideoUploadPayload | VideoCard> | null = null;
  @Output() submitVideo = new EventEmitter<VideoUploadPayload>();

  protected categories: CategoryOption[] = [{ id: 1, name: 'Music' }];
  protected isLoadingCategories = true;

  protected readonly videoForm = this.formBuilder.nonNullable.group({
    thumbnailUrl: ['', Validators.required],
    videoSourceUrl: ['', Validators.required],
    authorImageUrl: ['', Validators.required],
    title: ['', Validators.required],
    channelName: ['', Validators.required],
    categoryId: [1, Validators.required],
    meta: ['', Validators.required],
    userId: [null as number | null]
  });

  ngOnInit(): void {
    this.syncUserIdInForm();
    this.loadCategories();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resetKey'] && !changes['resetKey'].firstChange) {
      this.videoForm.reset({
        thumbnailUrl: '',
        videoSourceUrl: '',
        authorImageUrl: '',
        title: '',
        channelName: '',
        categoryId: this.defaultCategory.id,
        meta: '',
        userId: this.authService.currentUser()?.id ?? null
      });
    }

    if (changes['initialData'] && this.initialData) {
      this.videoForm.reset({
        thumbnailUrl: this.initialData.thumbnailUrl ?? '',
        videoSourceUrl: this.initialData.videoSourceUrl ?? '',
        authorImageUrl: this.initialData.authorImageUrl ?? '',
        title: this.initialData.title ?? '',
        channelName: this.initialData.channelName ?? '',
        categoryId: this.resolveInitialCategoryId(),
        meta: this.initialData.meta ?? '',
        userId: this.authService.currentUser()?.id ?? null
      });
    }

    this.syncUserIdInForm();
  }

  protected onSubmit(): void {
    if (this.videoForm.invalid) {
      this.videoForm.markAllAsTouched();
      return;
    }

    const formValue = this.videoForm.getRawValue();
    const selectedCategory = this.getCategoryById(formValue.categoryId) ?? this.defaultCategory;
    const payload: VideoUploadPayload = {
      thumbnailUrl: formValue.thumbnailUrl,
      videoSourceUrl: formValue.videoSourceUrl,
      authorImageUrl: formValue.authorImageUrl,
      title: formValue.title,
      channelName: formValue.channelName,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      meta: formValue.meta
    };

    if (typeof formValue.userId === 'number') {
      payload.userId = formValue.userId;
    }

    this.submitVideo.emit(payload);
  }

  protected get formTitle(): string {
    return this.isEditMode ? 'Edit Video' : 'Add Video';
  }

  protected get submitButtonText(): string {
    return this.isSubmitting
      ? this.isEditMode ? 'Updating...' : 'Uploading...'
      : this.isEditMode ? 'Update Video' : 'Upload Video';
  }

  private get defaultCategory(): CategoryOption {
    return this.categories[0] ?? { id: 1, name: 'Music' };
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        if (categories.length) {
          this.categories = categories;
        }

        if (this.initialData) {
          this.videoForm.controls.categoryId.setValue(this.resolveInitialCategoryId());
        }

        const currentCategoryId = this.videoForm.controls.categoryId.value;
        if (!currentCategoryId || !this.getCategoryById(currentCategoryId)) {
          this.videoForm.controls.categoryId.setValue(this.defaultCategory.id);
        }

        this.isLoadingCategories = false;
      },
      error: () => {
        this.isLoadingCategories = false;
        this.videoForm.controls.categoryId.setValue(this.defaultCategory.id);
      }
    });
  }

  private resolveInitialCategoryId(): number {
    if (typeof this.initialData?.categoryId === 'number') {
      return this.initialData.categoryId;
    }

    const legacyCategory = this.initialData && 'category' in this.initialData ? this.initialData.category : undefined;
    const categoryName = this.initialData?.categoryName ?? legacyCategory;
    if (categoryName) {
      const matchedCategory = this.categories.find((category) => category.name === categoryName);
      if (matchedCategory) {
        return matchedCategory.id;
      }
    }

    return this.defaultCategory.id;
  }

  private syncUserIdInForm(): void {
    this.videoForm.controls.userId.setValue(this.authService.currentUser()?.id ?? null, { emitEvent: false });
  }

  private getCategoryById(categoryId: number): CategoryOption | undefined {
    return this.categories.find((category) => category.id === categoryId);
  }
}

