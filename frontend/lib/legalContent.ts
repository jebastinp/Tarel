export type LegalContentBlock = 
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }

export type LegalSection = {
  heading: string
  blocks: LegalContentBlock[]
}

export type LegalPage = {
  slug: string
  title: string
  summary?: string
  lastUpdated: string
  sections: LegalSection[]
}

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    summary:
      'These Terms & Conditions govern your use of the Tarel website and all orders placed through it.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Welcome to Tarel',
        blocks: [
          {
            type: 'paragraph',
            text: 'These Terms & Conditions govern your use of our website www.tarel.co.uk and all orders placed through it. By accessing or using our Website, you agree to these Terms.',
          },
        ],
      },
      {
        heading: '1. Company Information',
        blocks: [
          {
            type: 'paragraph',
            text: 'Tarel is a UK-registered food business providing fresh, high-quality raw fish to consumers and businesses across the UK.',
          },
          {
            type: 'list',
            items: [
              'Registered Address: London, United Kingdom',
              'Email: support@tarel.co.uk',
              'Company Registration No.: [Add once registered with Companies House]',
                'VAT No.: [If applicable, add VAT number here]'
            ],
          },
        ],
      },
      {
        heading: '2. Eligibility',
        blocks: [
          { type: 'list', items: ['At least 18 years of age', 'Legally capable of entering a binding contract under UK law'] },
        ],
      },
      {
        heading: '3. Product Information',
        blocks: [
          {
            type: 'paragraph',
            text: 'We aim to provide accurate product descriptions, images, and pricing. Please note that fish products are natural items and may vary slightly in size, weight, or appearance.',
          },
        ],
      },
      {
        heading: '4. Pricing & Payment',
        blocks: [
          {
            type: 'list',
            items: [
              'All prices are listed in GBP (£) and include VAT where applicable.',
              'Payment is due at checkout.',
              'We accept major UK debit/credit cards, PayPal, and digital wallets.',
              'Payment details are processed securely through encrypted third-party gateways.',
            ],
          },
        ],
      },
      {
        heading: '5. Order Acceptance',
        blocks: [
          {
            type: 'paragraph',
            text: 'Your order is an offer to purchase. A contract is formed only when you receive a confirmation email from us.',
          },
          {
            type: 'paragraph',
            text: 'We reserve the right to cancel any order if stock is unavailable or payment authorisation fails.',
          },
        ],
      },
      {
        heading: '6. Delivery',
        blocks: [
          {
            type: 'paragraph',
            text: 'Delivery details are covered in our Shipping & Delivery Policy. We deliver across the UK mainland using temperature-controlled logistics to maintain freshness.',
          },
        ],
      },
      {
        heading: '7. Cancellation Rights',
        blocks: [
          {
            type: 'paragraph',
            text: 'Under the Consumer Contracts Regulations 2013, you have a 14-day cooling-off period for most goods. However, perishable items like fresh fish are exempt from this right once dispatched.',
          },
        ],
      },
      {
        heading: '8. Returns & Refunds',
        blocks: [
          { type: 'paragraph', text: 'Please see our Refunds & Returns Policy for more details.' },
        ],
      },
      {
        heading: '9. Warranty',
        blocks: [
          {
            type: 'paragraph',
            text: 'All products are guaranteed to arrive fresh and in good condition. We make no warranties beyond what is explicitly stated in our policies.',
          },
        ],
      },
      {
        heading: '10. Limitation of Liability',
        blocks: [
          {
            type: 'paragraph',
            text: 'We are not liable for indirect or consequential losses, including loss of income or business. Our maximum liability for any order is limited to the purchase price of that order.',
          },
        ],
      },
      {
        heading: '11. Governing Law',
        blocks: [
          { type: 'paragraph', text: 'These Terms are governed by the laws of England and Wales. Disputes will be resolved exclusively in English courts.' },
        ],
      },
    ],
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    summary: 'Our commitment to protecting your personal data in line with UK GDPR and the Data Protection Act 2018.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: '1. Overview',
        blocks: [
          {
            type: 'paragraph',
            text: 'Tarel respects your privacy and is committed to protecting your personal data in compliance with UK GDPR and the Data Protection Act 2018.',
          },
        ],
      },
      {
        heading: '2. Data We Collect',
        blocks: [
          {
            type: 'list',
            items: [
              'Personal details (name, address, phone number, email)',
              'Payment details (processed securely via third-party providers)',
              'Order history and preferences',
              'Website usage data (cookies, analytics)',
            ],
          },
        ],
      },
      {
        heading: '3. How We Use Your Data',
        blocks: [
          {
            type: 'list',
            items: [
              'To process and deliver your orders',
              'To improve our website and services',
              'To communicate offers, updates, or service notices',
              'To comply with legal obligations (e.g., tax reporting)',
            ],
          },
        ],
      },
      {
        heading: '4. Data Retention',
        blocks: [
          {
            type: 'paragraph',
            text: 'We retain your data only for as long as necessary to fulfil our obligations or as required by law.',
          },
        ],
      },
      {
        heading: '5. Data Security',
        blocks: [
          {
            type: 'paragraph',
            text: 'All personal information is stored securely using SSL encryption and secure UK-based servers.',
          },
        ],
      },
      {
        heading: '6. Sharing Data',
        blocks: [
          {
            type: 'paragraph',
            text: 'We share limited information with trusted partners and never sell personal data.',
          },
          {
            type: 'list',
            items: [
              'Delivery and logistics partners',
              'Payment service providers',
              'Marketing and analytics services (only with consent)',
            ],
          },
        ],
      },
      {
        heading: '7. Your Rights',
        blocks: [
          {
            type: 'paragraph',
            text: 'Under UK GDPR, you have the right to access, correct, or delete your data and withdraw consent for marketing.',
          },
          {
            type: 'paragraph',
            text: 'To exercise these rights, email privacy@tarel.co.uk.',
          },
        ],
      },
    ],
  },
  {
    slug: 'shipping-and-delivery-policy',
    title: 'Shipping & Delivery Policy',
    summary: 'Details about how we prepare, schedule, and deliver your orders across the UK mainland.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: '1. Delivery Coverage',
        blocks: [{ type: 'paragraph', text: 'We currently deliver across the United Kingdom (mainland only).' }],
      },
      {
        heading: '2. Dispatch & Delivery Time',
        blocks: [
          {
            type: 'paragraph',
            text: 'Orders placed between Monday and Friday will be delivered the following Wednesday.',
          },
          {
            type: 'paragraph',
            text: 'Weekend and bank holiday orders will be processed on the next working day.',
          },
        ],
      },
      {
        heading: '3. Delivery Conditions',
        blocks: [
          {
            type: 'paragraph',
            text: 'Products are shipped using temperature-controlled packaging to maintain freshness. You must ensure someone is available to receive the delivery.',
          },
        ],
      },
      {
        heading: '4. Delivery Charges',
        blocks: [
          {
            type: 'paragraph',
            text: 'Shipping costs are calculated automatically at checkout based on location and order weight.',
          },
        ],
      },
      {
        heading: '5. Missed Deliveries',
        blocks: [
          {
            type: 'paragraph',
            text: 'If no one is available, our courier will attempt redelivery or provide collection details.',
          },
        ],
      },
      {
        heading: '6. Damaged or Delayed Deliveries',
        blocks: [
          {
            type: 'paragraph',
            text: 'Please report any issues within 24 hours of receipt by emailing support@tarel.co.uk.',
          },
        ],
      },
    ],
  },
  {
    slug: 'refunds-and-returns-policy',
    title: 'Refunds & Returns Policy',
    summary: 'Guidance on when and how refunds or returns can be requested for perishable goods.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Eligibility for Refund',
        blocks: [
          {
            type: 'paragraph',
            text: 'Due to the perishable nature of our products, refunds may be issued only under specific conditions.',
          },
          {
            type: 'list',
            items: [
              'You received a damaged, spoiled, or incorrect item.',
              'You notify us within 24 hours of delivery with photographic evidence.',
            ],
          },
        ],
      },
      {
        heading: 'Refund Procedure',
        blocks: [
          {
            type: 'paragraph',
            text: 'Email returns@tarel.co.uk with your order number, photos of the product, and a description of the issue.',
          },
          {
            type: 'paragraph',
            text: 'Once verified, refunds are processed to your original payment method within 3–5 business days.',
          },
        ],
      },
      {
        heading: 'Non-Returnable Items',
        blocks: [
          {
            type: 'list',
            items: [
              'Opened or consumed products',
              'Products not stored according to label instructions',
              'Delays caused by customer unavailability',
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'food-safety-and-hygiene',
    title: 'Food Safety & Hygiene',
    summary: 'Learn how we safeguard product quality through robust safety and hygiene practices.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Our Standards',
        blocks: [
          {
            type: 'paragraph',
            text: 'We maintain the highest standards of food safety in compliance with the UK Food Standards Agency (FSA).',
          },
          {
            type: 'paragraph',
            text: 'All handling and packaging follow HACCP (Hazard Analysis and Critical Control Points) standards.',
          },
          {
            type: 'paragraph',
            text: 'Products are stored and transported under continuous cold-chain conditions.',
          },
          {
            type: 'paragraph',
            text: 'Regular hygiene audits are carried out by certified inspectors.',
          },
        ],
      },
      {
        heading: 'Contact',
        blocks: [{ type: 'paragraph', text: 'For concerns, contact foodsafety@tarel.co.uk.' }],
      },
    ],
  },
  {
    slug: 'allergen-and-product-information',
    title: 'Allergen & Product Information',
    summary: 'Important allergen and product handling information for our seafood range.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Allergen Transparency',
        blocks: [
          {
            type: 'paragraph',
            text: 'All products are clearly labelled with allergen and nutritional details. Our fish may contain traces of shellfish, crustaceans, or molluscs.',
          },
          {
            type: 'paragraph',
            text: 'Cross-contamination, though minimal, may occur in processing environments.',
          },
        ],
      },
      {
        heading: 'Contact',
        blocks: [{ type: 'paragraph', text: 'For inquiries, email allergens@tarel.co.uk.' }],
      },
    ],
  },
  {
    slug: 'accessibility-statement',
    title: 'Accessibility Statement',
    summary: 'How we deliver a digital experience that works for everyone.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Our Commitment',
        blocks: [
          {
            type: 'paragraph',
            text: 'Tarel is committed to digital accessibility for all users and adheres to WCAG 2.1 Level AA standards.',
          },
        ],
      },
      {
        heading: 'Accessibility Features',
        blocks: [
          {
            type: 'list',
            items: ['Adjustable text sizes and contrast', 'Screen reader compatibility', 'Text alternatives for all non-text elements'],
          },
        ],
      },
      {
        heading: 'Feedback',
        blocks: [{ type: 'paragraph', text: 'Share accessibility feedback at accessibility@tarel.co.uk.' }],
      },
    ],
  },
  {
    slug: 'tax-strategy',
    title: 'Tax Strategy',
    summary: 'An overview of our approach to responsible, transparent tax practices in the UK.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Our Approach',
        blocks: [
          {
            type: 'paragraph',
            text: 'Tarel is a transparent, fully compliant UK taxpayer. We pay all applicable taxes to HMRC and avoid aggressive tax planning.',
          },
          {
            type: 'paragraph',
            text: 'We maintain accurate records verified by licensed accountants and uphold ethical, responsible financial conduct.',
          },
        ],
      },
    ],
  },
  {
    slug: 'our-liability',
    title: 'Our Liability',
    summary: 'Clarifies the limits of our liability and scenarios we cannot control.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Scope of Liability',
        blocks: [
          {
            type: 'paragraph',
            text: 'We are not responsible for losses arising from events beyond our control, such as transport delays or natural events.',
          },
          {
            type: 'paragraph',
            text: 'Our liability is limited to the total amount paid for the affected order.',
          },
          {
            type: 'paragraph',
            text: 'Nothing in these Terms limits liability for death or personal injury caused by negligence.',
          },
        ],
      },
    ],
  },
  {
    slug: 'contact-us',
    title: 'Contact Us',
    summary: 'How to reach the Tarel customer support team.',
    lastUpdated: 'October 2025',
    sections: [
      {
        heading: 'Customer Support',
        blocks: [
          {
            type: 'list',
            items: [
              'Address: London, United Kingdom',
              'Email: support@tarel.co.uk',
              'Phone: +44 (0)20 1234 5678',
              'Website: www.tarel.co.uk',
            ],
          },
        ],
      },
    ],
  },
]

export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((page) => page.slug === slug)
}
