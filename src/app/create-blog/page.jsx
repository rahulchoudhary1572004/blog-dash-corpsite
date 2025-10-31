'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CreateBlogPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingBlog, setIsFetchingBlog] = useState(false);
  const [authors, setAuthors] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    status: 'Published',
    tags: '',
    reviewed_at: '',
    read_time: '',
    published_date: '',
    isTopRated: false,
    is_archived: false,
    author_id: ''
  });
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [blogId, setBlogId] = useState(null);
  const [changedFields, setChangedFields] = useState({});
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    fetchAuthors();
    
    // Check if we're editing an existing blog post
    const id = searchParams.get('id');
    if (id && id !== 'undefined' && id !== 'null') {
      setBlogId(id);
      fetchBlogPost(id);
    }
  }, [searchParams]);

  const fetchAuthors = async () => {
    try {
      const response = await fetch(`${BASE_URL}/authors`);
      if (!response.ok) throw new Error('Failed to fetch authors');
      const data = await response.json();
      setAuthors(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching authors:', error);
      setErrors(prev => ({ ...prev, authors: 'Failed to load authors' }));
    }
  };

  const fetchBlogPost = async (id) => {
    try {
      setIsFetchingBlog(true);
      setErrors({});
      
      const response = await fetch(`${BASE_URL}/blog_posts/blog_post/?blog_id=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch blog post');
      }
      
      const data = await response.json();
      
      // Convert date format (YYYY-MM-DD)
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0];
        } catch (e) {
          return '';
        }
      };
      
      // Set form data with fetched blog data
      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        content: data.content || '',
        status: data.status || 'Published',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (typeof data.tags === 'string' ? data.tags : ''),
        reviewed_at: formatDate(data.reviewed_at),
        read_time: data.read_time || data.readingTime || '',
        published_date: formatDate(data.published_date || data.publishedDate),
        isTopRated: Boolean(data.isTopRated),
        is_archived: Boolean(data.is_archived),
        author_id: data.author_id || data.author?.id || ''
      });
      
      // Reset changed fields when loading existing blog
      setChangedFields({});
      
    } catch (error) {
      console.error('Error fetching blog post:', error);
      setErrors({ submit: 'Failed to load blog post data. Please try again.' });
    } finally {
      setIsFetchingBlog(false);
    }
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'title') {
      const newSlug = generateSlug(value);
      
      setFormData(prev => ({
        ...prev,
        title: value,
        slug: newSlug
      }));
      
      setChangedFields(prev => ({
        ...prev,
        title: value,
        slug: newSlug
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
      
      setChangedFields(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      setChangedFields(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setChangedFields(prev => ({
        ...prev,
        file: selectedFile
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.author_id) newErrors.author_id = 'Author is required';
    if (!formData.published_date) newErrors.published_date = 'Published date is required';
    if (!formData.read_time.trim()) newErrors.read_time = 'Read time is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');
    setErrors({});

    try {
      const formDataToSend = new FormData();
      
      if (blogId) {
        // UPDATE MODE - Only send changed fields
        const updatedData = {};
        
        Object.keys(changedFields).forEach(key => {
          if (key === 'tags') {
            const tagsArray = changedFields[key].split(',').map(tag => tag.trim()).filter(tag => tag);
            updatedData[key] = tagsArray;
          } else if (key !== 'file') {
            updatedData[key] = changedFields[key];
          }
        });

        // Always include is_archived based on current status
        updatedData.is_archived = formData.status === 'Archived';
        
        if (Object.keys(updatedData).length > 0) {
          formDataToSend.append('blog_data', JSON.stringify(updatedData));
        }
        
        if (changedFields.file && file) {
          formDataToSend.append('file', file);
        }

        const response = await fetch(`${BASE_URL}/blog_posts/${blogId}`, {
          method: 'POST',
          body: formDataToSend
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to update blog post');
        }

        setSuccessMessage('Blog post updated successfully!');
        setChangedFields({});
        
        // Redirect after success
        setTimeout(() => {
          router.push('/');
        }, 1500);
        
      } else {
        // CREATE MODE - Send all fields
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        const blogData = {
          ...formData,
          tags: tagsArray,
          is_archived: formData.status === 'Archived'
        };
        
        formDataToSend.append('blog_data', JSON.stringify(blogData));
        
        if (file) {
          formDataToSend.append('file', file);
        }

        const response = await fetch(`${BASE_URL}/blog_posts/`, {
          method: 'POST',
          body: formDataToSend
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create blog post');
        }

        setSuccessMessage('Blog post created successfully!');
        
        // Redirect after success
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }

    } catch (error) {
      console.error('Error submitting blog post:', error);
      setErrors({ submit: error.message || `Failed to ${blogId ? 'update' : 'create'} blog post. Please try again.` });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state when fetching blog data
  if (isFetchingBlog) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading blog data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border-t-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">
                {blogId ? 'Update Blog Post' : 'Create New Blog Post'}
              </h1>
              <p className="text-gray-600">Share your insights with the world</p>
            </div>
            <div className="hidden sm:block">
              <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-md">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-md">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-semibold">{errors.submit}</p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
          <div className="space-y-6">
            {/* Title Field */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-900 mb-2">
                Blog Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="Enter an engaging blog title"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.title}
                </p>
              )}
            </div>

            {/* Slug Field */}
            <div>
              <label htmlFor="slug" className="block text-sm font-semibold text-gray-900 mb-2">
                URL Slug <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50"
                placeholder="auto-generated-from-title"
              />
              {errors.slug && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.slug}
                </p>
              )}
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                placeholder="Write a compelling description..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.description}
                </p>
              )}
            </div>

            {/* Content Field */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-gray-900 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                rows="12"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none font-mono text-sm"
                placeholder="Write your full blog content here..."
              />
              {errors.content && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.content}
                </p>
              )}
            </div>

            {/* Two Column Grid - Status & Author */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="status" className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer"
                >
                  <option value="Published">✓ Published</option>
                  <option value="Draft">📝 Draft</option>
                  <option value="Archived">📦 Archived</option>
                </select>
              </div>

              <div>
                <label htmlFor="author_id" className="block text-sm font-semibold text-gray-900 mb-2">
                  Author <span className="text-red-500">*</span>
                </label>
                <select
                  id="author_id"
                  name="author_id"
                  value={formData.author_id}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer"
                >
                  <option value="">Select an author</option>
                  {authors.map(author => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
                {errors.author_id && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.author_id}
                  </p>
                )}
              </div>
            </div>

            {/* Tags Field */}
            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-gray-900 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                placeholder="AI, Technology, Web Development"
              />
              <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
            </div>

            {/* Three Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="published_date" className="block text-sm font-semibold text-gray-900 mb-2">
                  Published Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="published_date"
                  name="published_date"
                  value={formData.published_date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer"
                />
                {errors.published_date && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.published_date}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reviewed_at" className="block text-sm font-semibold text-gray-900 mb-2">
                  Reviewed Date
                </label>
                <input
                  type="date"
                  id="reviewed_at"
                  name="reviewed_at"
                  value={formData.reviewed_at}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none cursor-pointer"
                />
              </div>

              <div>
                <label htmlFor="read_time" className="block text-sm font-semibold text-gray-900 mb-2">
                  Read Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="read_time"
                  name="read_time"
                  value={formData.read_time}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="5 min"
                />
                {errors.read_time && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.read_time}
                  </p>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file" className="block text-sm font-semibold text-gray-900 mb-2">
                Featured Image
              </label>
              <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-all bg-gray-50">
                <input
                  type="file"
                  id="file"
                  name="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">
                    {file ? (
                      <span className="font-semibold text-blue-600">✓ {file.name}</span>
                    ) : (
                      <>
                        <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Top Rated Checkbox */}
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <input
                type="checkbox"
                id="isTopRated"
                name="isTopRated"
                checked={formData.isTopRated}
                onChange={handleInputChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer flex-shrink-0"
              />
              <label htmlFor="isTopRated" className="text-sm font-semibold text-gray-900 cursor-pointer flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Mark as Top Rated
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t-2 border-gray-200">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-base py-4 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {blogId ? 'Updating Blog Post...' : 'Publishing Blog Post...'}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {blogId ? 'Update Blog Post' : 'Publish Blog Post'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>© 2025 Blog Admin. All fields marked with <span className="text-red-500">*</span> are required.</p>
        </div>
      </div>
    </div>
  );
}
