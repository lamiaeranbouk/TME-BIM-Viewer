import { Component, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { IfcLoaderService, UploadProgress } from '../services/ifc-loader.service';
import * as THREE from 'three';

@Component({
  selector: 'app-ifc-viewer',
  template: `
    <div class="ifc-viewer-container">
      <div class="controls-panel">
        <h2>BIM/IFC Viewer</h2>

        <!-- Section URL -->
        <div class="control-section">
          <h3>Charger depuis une URL</h3>
          <div class="url-input-group">
            <input
              type="url"
              [(ngModel)]="ifcUrl"
              placeholder="https://example.com/file.ifc"
              class="url-input"
            />
            <button (click)="loadFromUrl()" [disabled]="!ifcUrl || isLoading" class="load-btn">
              {{ isLoading ? 'Chargement...' : 'Charger' }}
            </button>
          </div>
        </div>

        <!-- Section Upload -->
        <div class="control-section">
          <h3>Upload de fichier local</h3>
          <div class="file-input-group">
            <input
              type="file"
              #fileInput
              accept=".ifc,.IFC"
              (change)="onFileSelected($event)"
              class="file-input"
            />
            <button (click)="fileInput.click()" class="select-file-btn">
              Sélectionner un fichier IFC
            </button>
          </div>
        </div>

        <!-- Exemple -->
        <div class="control-section">
          <h3>Exemple</h3>
          <button (click)="loadExample()" [disabled]="isLoading" class="example-btn">
            Charger l'exemple
          </button>
        </div>

        <!-- Progress -->
        <div class="progress-section" *ngIf="uploadProgress.status === 'uploading'">
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="uploadProgress.progress"></div>
          </div>
          <p class="progress-text">{{ uploadProgress.message }}</p>
        </div>

        <!-- Status -->
        <div class="status-section">
          <p class="status" [class.error]="hasError" [class.success]="!hasError && statusMessage">
            {{ statusMessage }}
          </p>
        </div>
      </div>

      <!-- 3D Viewer -->
      <div class="viewer-container">
        <canvas #canvas class="viewer-canvas"></canvas>
      </div>
    </div>
  `,
  styles: [`
    .ifc-viewer-container {
      display: flex;
      height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .controls-panel {
      width: 350px;
      background: #2c3e50;
      color: white;
      padding: 20px;
      overflow-y: auto;
      box-shadow: 2px 0 10px rgba(0,0,0,0.1);
    }

    .controls-panel h2 {
      margin: 0 0 30px 0;
      color: #3498db;
      text-align: center;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }

    .control-section {
      margin-bottom: 30px;
      padding: 15px;
      background: rgba(255,255,255,0.05);
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }

    .control-section h3 {
      margin: 0 0 15px 0;
      color: #ecf0f1;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .url-input-group {
      display: flex;
      gap: 10px;
    }

    .url-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #34495e;
      border-radius: 5px;
      background: #34495e;
      color: white;
      font-size: 14px;
    }

    .url-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 5px rgba(52, 152, 219, 0.3);
    }

    .load-btn, .select-file-btn, .example-btn {
      padding: 10px 15px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s ease;
    }

    .load-btn:hover, .select-file-btn:hover, .example-btn:hover {
      background: #2980b9;
      transform: translateY(-1px);
    }

    .load-btn:disabled, .select-file-btn:disabled, .example-btn:disabled {
      background: #7f8c8d;
      cursor: not-allowed;
      transform: none;
    }

    .file-input-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .file-input {
      display: none;
    }

    .select-file-btn {
      width: 100%;
      background: #27ae60;
    }

    .select-file-btn:hover {
      background: #219a52;
    }

    .example-btn {
      width: 100%;
      background: #e67e22;
    }

    .example-btn:hover {
      background: #d35400;
    }

    .progress-section {
      margin-top: 20px;
    }

    .progress-bar {
      width: 100%;
      height: 8px;
      background: #34495e;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3498db, #2ecc71);
      transition: width 0.3s ease;
    }

    .progress-text {
      margin: 10px 0 0 0;
      font-size: 12px;
      color: #bdc3c7;
      text-align: center;
    }

    .status-section {
      margin-top: 20px;
      padding: 15px;
      border-radius: 5px;
      background: rgba(255,255,255,0.05);
    }

    .status {
      margin: 0;
      font-size: 14px;
      text-align: center;
    }

    .status.error {
      color: #e74c3c;
    }

    .status.success {
      color: #2ecc71;
    }

    .viewer-container {
      flex: 1;
      position: relative;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .viewer-canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class IfcViewerComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  ifcUrl: string = '';
  isLoading: boolean = false;
  hasError: boolean = false;
  statusMessage: string = '';
  uploadProgress: UploadProgress = { progress: 0, status: 'complete' };

  // Three.js variables
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;

  constructor(private ifcLoader: IfcLoaderService) {}

  ngOnInit() {
    this.initThreeJS();
    this.setupProgressSubscription();
    this.checkServerStatus();
  }

  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThreeJS() {
    const canvas = this.canvasRef.nativeElement;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(5, 5, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Controls (basic orbit simulation)
    this.setupBasicControls();

    // Add a sample cube for demo
    this.addSampleGeometry();

    // Start render loop
    this.animate();

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private addSampleGeometry() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshLambertMaterial({ color: 0x3498db });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);

    // Add ground plane
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1;
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  private setupBasicControls() {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;

    this.canvasRef.nativeElement.addEventListener('mousedown', (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    this.canvasRef.nativeElement.addEventListener('mousemove', (event) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      this.camera.position.x = Math.cos(deltaX * 0.01) * 5;
      this.camera.position.z = Math.sin(deltaX * 0.01) * 5;
      this.camera.position.y += deltaY * 0.01;

      this.camera.lookAt(0, 0, 0);

      mouseX = event.clientX;
      mouseY = event.clientY;
    });

    this.canvasRef.nativeElement.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    // Mouse wheel for zoom
    this.canvasRef.nativeElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      const scale = event.deltaY > 0 ? 1.1 : 0.9;
      this.camera.position.multiplyScalar(scale);
    });
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    const canvas = this.canvasRef.nativeElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  private setupProgressSubscription() {
    this.ifcLoader.uploadProgress$.subscribe(progress => {
      this.uploadProgress = progress;
    });
  }

  private checkServerStatus() {
    this.ifcLoader.checkServerHealth().subscribe({
      next: (response) => {
        this.statusMessage = 'Serveur connecté ✓';
        this.hasError = false;
      },
      error: (error) => {
        this.statusMessage = 'Erreur de connexion au serveur';
        this.hasError = true;
      }
    });
  }

  loadFromUrl() {
    if (!this.ifcUrl) return;

    this.isLoading = true;
    this.hasError = false;
    this.statusMessage = 'Chargement du fichier IFC...';

    this.ifcLoader.loadFromUrl(this.ifcUrl).subscribe({
      next: (data) => {
        this.statusMessage = 'Fichier IFC chargé avec succès ✓';
        this.processIfcData(data);
        this.isLoading = false;
      },
      error: (error) => {
        this.statusMessage = `Erreur de chargement: ${error.message}`;
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isLoading = true;
    this.hasError = false;
    this.statusMessage = 'Upload du fichier en cours...';

    this.ifcLoader.uploadFile(file).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.statusMessage = 'Fichier uploadé, chargement...';
          this.loadUploadedFile(response.file.filename);
        }
      },
      error: (error) => {
        this.statusMessage = `Erreur d'upload: ${error.message}`;
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private loadUploadedFile(filename: string) {
    this.ifcLoader.loadUploadedFile(filename).subscribe({
      next: (data) => {
        this.statusMessage = 'Fichier IFC traité avec succès ✓';
        this.processIfcData(data);
        this.isLoading = false;
      },
      error: (error) => {
        this.statusMessage = `Erreur de traitement: ${error.message}`;
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  loadExample() {
    // URL d'exemple d'un fichier IFC
    this.ifcUrl = 'https://www.steptools.com/docs/stpfiles/ifc/AC20-FZK-Haus.ifc';
    this.loadFromUrl();
  }

  private processIfcData(data: ArrayBuffer) {
    // Ici vous pouvez intégrer web-ifc pour traiter les données IFC
    // Pour l'instant, on simule le traitement
    console.log('Données IFC reçues:', data.byteLength, 'bytes');

    // Remplacer le cube par défaut par une représentation simple
    this.scene.clear();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    this.scene.add(directionalLight);

    // Simulation d'un bâtiment simple
    this.addBuildingSimulation();
  }

  private addBuildingSimulation() {
    // Sol
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Murs
    const wallGeometry = new THREE.BoxGeometry(10, 3, 0.2);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });

    // Mur avant
    const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
    frontWall.position.set(0, 1.5, 5);
    this.scene.add(frontWall);

    // Mur arrière
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 1.5, -5);
    this.scene.add(backWall);

    // Murs latéraux
    const sideWallGeometry = new THREE.BoxGeometry(0.2, 3, 10);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-5, 1.5, 0);
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(5, 1.5, 0);
    this.scene.add(rightWall);

    // Toit
    const roofGeometry = new THREE.ConeGeometry(7, 2, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(0, 4, 0);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(roof);

    // Ajuster la caméra
    this.camera.position.set(15, 10, 15);
    this.camera.lookAt(0, 0, 0);
  }
}
