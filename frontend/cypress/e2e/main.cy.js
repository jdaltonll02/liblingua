describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173');
  });

  it('displays navigation with contributors link', () => {
    cy.get('nav').should('be.visible');
    cy.contains('Contributors').should('be.visible');
  });

  it('navigates to contributors page', () => {
    cy.contains('Contributors').click();
    cy.url().should('include', '/contributors');
  });

  it('displays sign in and contribute buttons', () => {
    cy.contains('Sign In').should('be.visible');
    cy.contains('Contribute').should('be.visible');
  });
});

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('http://localhost:5173/auth');
  });

  it('displays login form', () => {
    cy.get('input[type="email"]').should('be.visible');
    cy.get('input[type="password"]').should('be.visible');
  });

  it('shows validation errors for empty fields', () => {
    cy.get('button[type="submit"]').click();
    cy.contains('Email is required').should('be.visible');
  });
});
