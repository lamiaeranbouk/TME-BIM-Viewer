import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class IfcLoaderService {
  private uploadProgress = new BehaviorSubject<UploadProgress>({ progress: 0, status: 'complete' });
  public uploadProgress$ = this.uploadProgress.asObservable();

  constructor(private http: HttpClient) {}

  // Charger un fichier IFC depuis une URL avec proxy
  loadFromUrl(url: string): Observable<ArrayBuffer> {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    return this.http.get(proxyUrl, {
      responseType: 'arraybuffer',
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<ArrayBuffer>) => {
        switch (event.type) {
          case HttpEventType.DownloadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              this.uploadProgress.next({ progress, status: 'uploading', message: `Téléchargement: ${progress}%` });
            }
            break;
          case HttpEventType.Response:
            this.uploadProgress.next({ progress: 100, status: 'complete', message: 'Téléchargement terminé' });
            return event.body!;
        }
        throw new Error('Événement non géré');
      })
    );
  }

  // Upload d'un fichier local
  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post('/api/upload', formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              this.uploadProgress.next({ progress, status: 'uploading', message: `Upload: ${progress}%` });
            }
            break;
          case HttpEventType.Response:
            this.uploadProgress.next({ progress: 100, status: 'complete', message: 'Upload terminé' });
            return event.body;
        }
        return null;
      })
    );
  }

  // Charger un fichier uploadé
  loadUploadedFile(filename: string): Observable<ArrayBuffer> {
    return this.http.get(`/api/files/${filename}`, { responseType: 'arraybuffer' });
  }

  // Vérifier la santé du serveur
  checkServerHealth(): Observable<any> {
    return this.http.get('/api/health');
  }
}
