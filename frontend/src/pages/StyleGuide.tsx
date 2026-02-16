/**
 * Style Guide Page
 * Visual reference for all UI components and styles
 */
import React, { FormEvent } from 'react';
import './StyleGuide.css';

const StyleGuide: React.FC = () => {
  const handleFormSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
  };

  return (
    <div className="style-guide">
      <h1>LA Noire NextGen - Style Guide</h1>
      <p className="intro-text">
        A comprehensive visual reference for the 1940s Film Noir aesthetic used throughout the LA Noire NextGen system.
      </p>

      {/* Typography Section */}
      <section className="guide-section">
        <h2>Typography</h2>
        <div className="card">
          <h3>Headings</h3>
          <h1>Heading 1 - Main Title</h1>
          <h2>Heading 2 - Section Title</h2>
          <h3>Heading 3 - Subsection Title</h3>
          <h4>Heading 4 - Card Title</h4>
          <h5>Heading 5 - Small Title</h5>
          <h6>Heading 6 - Tiny Title</h6>
        </div>

        <div className="card mt-lg">
          <h3>Body Text</h3>
          <p>
            This is regular paragraph text using the <strong>Crimson Text</strong> font family. 
            It's designed to be highly readable while maintaining the vintage aesthetic of the 1940s era.
          </p>
          <p>
            Text can be <strong>bold for emphasis</strong>, <em>italicized for style</em>, or 
            <a href="#"> linked to other pages</a>.
          </p>
          <p className="font-primary">
            This text uses the Special Elite typewriter font - perfect for case reports and official documents.
          </p>
        </div>
      </section>

      {/* Colors Section */}
      <section className="guide-section">
        <h2>Color Palette</h2>
        <div className="color-grid">
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-noir-black)'}}></div>
            <div className="color-info">
              <div className="color-name">Noir Black</div>
              <div className="color-hex">#0a0a0a</div>
            </div>
          </div>
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-noir-charcoal)'}}></div>
            <div className="color-info">
              <div className="color-name">Noir Charcoal</div>
              <div className="color-hex">#1a1a1a</div>
            </div>
          </div>
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-gold)'}}></div>
            <div className="color-info">
              <div className="color-name">Gold</div>
              <div className="color-hex">#d4af37</div>
            </div>
          </div>
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-brass)'}}></div>
            <div className="color-info">
              <div className="color-name">Brass</div>
              <div className="color-hex">#b5a642</div>
            </div>
          </div>
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-crimson)'}}></div>
            <div className="color-info">
              <div className="color-name">Crimson</div>
              <div className="color-hex">#8b1a1a</div>
            </div>
          </div>
          <div className="color-card">
            <div className="color-sample" style={{backgroundColor: 'var(--color-evidence-blue)'}}></div>
            <div className="color-info">
              <div className="color-name">Evidence Blue</div>
              <div className="color-hex">#1a4d7a</div>
            </div>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section className="guide-section">
        <h2>Buttons</h2>
        <div className="card">
          <div className="button-showcase">
            <button className="btn">Default Button</button>
            <button className="btn btn-primary">Primary Button</button>
            <button className="btn btn-danger">Danger Button</button>
            <button className="btn" disabled>Disabled Button</button>
          </div>
        </div>
      </section>

      {/* Form Elements Section */}
      <section className="guide-section">
        <h2>Form Elements</h2>
        <div className="card">
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="text-input">Text Input</label>
              <input 
                type="text" 
                id="text-input" 
                placeholder="Enter text here..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="password-input">Password Input</label>
              <input 
                type="password" 
                id="password-input" 
                placeholder="Enter password..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="select-input">Select Dropdown</label>
              <select id="select-input">
                <option>Choose an option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="textarea-input">Textarea</label>
              <textarea 
                id="textarea-input" 
                rows={4}
                placeholder="Enter detailed information..."
              ></textarea>
            </div>
          </form>
        </div>
      </section>

      {/* Badges Section */}
      <section className="guide-section">
        <h2>Badges & Tags</h2>
        <div className="card">
          <div className="badge-showcase">
            <span className="badge">Default</span>
            <span className="badge badge-success">Success</span>
            <span className="badge badge-warning">Warning</span>
            <span className="badge badge-danger">Danger</span>
            <span className="badge badge-info">Info</span>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      <section className="guide-section">
        <h2>Alerts & Messages</h2>
        <div className="alert alert-info">
          <strong>Info:</strong> This is an informational message.
        </div>
        <div className="alert alert-success">
          <strong>Success:</strong> Operation completed successfully!
        </div>
        <div className="alert alert-warning">
          <strong>Warning:</strong> Please review this information carefully.
        </div>
        <div className="alert alert-danger">
          <strong>Error:</strong> An error occurred. Please try again.
        </div>
      </section>

      {/* Cards Section */}
      <section className="guide-section">
        <h2>Cards</h2>
        <div className="row">
          <div className="col-6">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Card with Header</h4>
              </div>
              <div className="card-body">
                <p>This is a card component with a header, body, and footer sections.</p>
              </div>
              <div className="card-footer">
                <button className="btn btn-primary">Action</button>
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Simple Card</h4>
              </div>
              <div className="card-body">
                <p>A basic card without a footer. Perfect for displaying information.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="guide-section">
        <h2>Tables</h2>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CASE-001</td>
                <td>Downtown Investigation</td>
                <td><span className="badge badge-warning">In Progress</span></td>
                <td>High</td>
              </tr>
              <tr>
                <td>CASE-002</td>
                <td>Evidence Analysis</td>
                <td><span className="badge badge-info">Pending</span></td>
                <td>Medium</td>
              </tr>
              <tr>
                <td>CASE-003</td>
                <td>Suspect Interrogation</td>
                <td><span className="badge badge-success">Completed</span></td>
                <td>Low</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Loading Spinner */}
      <section className="guide-section">
        <h2>Loading Spinner</h2>
        <div className="card">
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div className="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StyleGuide;
