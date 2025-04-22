import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router'; 
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AuthService } from '../auth.service';

declare const $3Dmol: any;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  accessionId: string = '';
  proteinData: any = null;
  pdb_array: any[] = [];
  errorMessage: string | null = null;
  pdbId: string | null = null;
  pdbwindow: string; 
  username: string;
  isLoggedIn: boolean = false;
  showFavorites: boolean = false;
  proteins: any[] = [];
  error: string | null = null;

  displayedColumns: string[] = ['id', 'chain', 'actions'];
  dataSource = new MatTableDataSource<any>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.isAuthenticated.subscribe((status: boolean) => {
      this.isLoggedIn = status;
    });

    this.username = this.authService.getUsername(); 
    this.route.queryParams.subscribe(params => {
      const accessionIdFromUrl = params['accessionId'];
      if (accessionIdFromUrl) {
        this.accessionId = accessionIdFromUrl;
        this.onSearch(); 
      }
    });
    
  }

  fetchSavedProteins(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.error = 'User is not authenticated';
      this.proteins = [];
      return;
    }

    this.http
      .get<any[]>('http://localhost:3000/home/results', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .subscribe(
        (data) => {
          if (Array.isArray(data)) {
            this.proteins = data;
            this.error = null; 
          } else {
            this.error = 'Unexpected response format';
            this.proteins = [];
          }
        },
        (err) => {
          this.error = 'Failed to fetch saved proteins';
          this.proteins = []; 
          console.error(err);
        }
      );
  }

  ngAfterViewInit(): void {
    this.dataSource.data = this.pdb_array;
    this.dataSource.paginator = this.paginator;
   // this.renderViewer('1AO7');
  }

  renderViewer(id: string): void {
    if (id) {
      this.pdbId = id;
      this.pdbwindow = "<div id='viewer' style='width: 100%; height: 400px;'></div>";
      const viewerContainer = document.getElementById('viewer-container');
      if (viewerContainer) {
        console.log("Rendering viewer...");
        viewerContainer.innerHTML = this.pdbwindow; 

        const viewer = $3Dmol.createViewer('viewer', { backgroundColor: 'white' });
        const pdbUrl = `https://files.rcsb.org/download/${id}.pdb`;
        fetch(pdbUrl)
          .then(response => response.text())
          .then(pdbData => {
            viewer.addModel(pdbData, 'pdb');
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
            viewer.zoomTo();
            viewer.render();
          })
          .catch(error => {
            console.error('Error loading PDB file:', error);
          });
      }
    }
  }

  onSearch(): void {
    const uniprotUrl = `https://rest.uniprot.org/uniprotkb/${this.accessionId}`;
    this.http.get(uniprotUrl).subscribe({
      next: (data) => {
        this.proteinData = data;
        console.log(this.proteinData);

        if (this.proteinData.uniProtKBCrossReferences) { 
          this.pdb_array = this.proteinData.uniProtKBCrossReferences.filter(
            ref => ref.database === 'PDB'
          );
          this.pdb_array.forEach(member => {
            member.properties = member.properties.filter(property => property.key === 'Chains');
          });
        } else {
          this.pdb_array = [];
        }

        this.dataSource.data = this.pdb_array;
        this.errorMessage = null;

        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }  
      },
      error: (err) => {
        this.proteinData = null;
        this.errorMessage = 'Protein not found. Please check the accession ID.';
      }
    });
  }

  highlightChain(chain: string): void {
    if (!chain) return;

    const match = chain.match(/(\d+)-(\d+)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const stop = parseInt(match[2], 10);

      const sequence = this.proteinData.sequence.value;
      const highlightedSequence =
        sequence.substring(0, start - 1) +
        '<span class="highlight">' +
        sequence.substring(start - 1, stop) +
        '</span>' +
        sequence.substring(stop);

      const sequenceElement = document.querySelector('.sequence-display');
      if (sequenceElement) {
        sequenceElement.innerHTML = highlightedSequence;
      }
    }
  }

  onSave(): void {
    if (!this.proteinData) return;

    const searchResult = {
      accessionId: this.proteinData.primaryAccession,
      name: this.proteinData.proteinDescription?.recommendedName?.fullName?.value,
      organism: this.proteinData.organism?.scientificName,
      sequenceLength: this.proteinData.sequence?.length,
      //sequence: this.proteinData.sequence?.value
    };

    const token = localStorage.getItem('authToken');
    console.log('Token:', token);

    this.http.post('http://localhost:3000/home/save', searchResult, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        alert('Search result saved successfully!');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.log(err);
        alert(err.error);
      }
    });
  }

  toggleFavorites(): void {
    this.showFavorites = !this.showFavorites;
  }
}
