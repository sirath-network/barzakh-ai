import { LegalPageShell } from "@/components/legal-page-shell";

const TERMS_TOC = [
    { title: "1. Acceptance of Terms", id: "acceptance" },
    { title: "2. Description of Services", id: "services" },
    { title: "3. Account Registration", id: "account" },
    { title: "4. Subscription & Payments", id: "payments" },
    { title: "5. Acceptable Use", id: "acceptable-use" },
    { title: "6. Intellectual Property", id: "ip" },
    { title: "7. AI-Generated Content", id: "ai-content" },
    { title: "8. Blockchain Data Disclaimer", id: "blockchain-disclaimer" },
    { title: "9. Limitation of Liability", id: "liability" },
    { title: "10. Indemnification", id: "indemnification" },
    { title: "11. Termination", id: "termination" },
    { title: "12. Governing Law", id: "governing-law" },
    { title: "13. Changes to Terms", id: "changes" },
    { title: "14. Contact Us", id: "contact" },
];

export default function TermsPage() {
    return (
        <LegalPageShell title="Terms of Service" lastUpdated="11 Dec 2025" toc={TERMS_TOC}>
            <p className="lead text-lg">
                Welcome to Barzakh, an AI-powered blockchain intelligence platform operated by Sirath Network ("Company," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our website, applications, APIs, and related services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.
            </p>

            <section>
                <h2 id="acceptance">1. Acceptance of Terms</h2>
                <p>
                    By creating an account, accessing our platform, or using any of our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you must not access or use our Services.
                </p>
                <p>
                    You represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. If you are accessing the Services on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
                </p>
            </section>

            <section>
                <h2 id="services">2. Description of Services</h2>
                <p>
                    Barzakh provides AI-powered blockchain intelligence services designed to streamline on-chain workflows. Our platform offers:
                </p>
                <ul>
                    <li><strong>Real-Time Intelligence:</strong> Access live, reliable on-chain data including wallet activity monitoring, transaction tracking, and blockchain analytics.</li>
                    <li><strong>AI-Driven Insights:</strong> Leverage artificial intelligence to analyze blockchain data, identify trends, and generate actionable insights.</li>
                    <li><strong>Regulatory Monitoring:</strong> Stay informed about blockchain regulations, policy changes, and compliance requirements across jurisdictions.</li>
                    <li><strong>Web & On-Chain Data Integration:</strong> Unified search capabilities that aggregate data from blockchain networks and web sources.</li>
                    <li><strong>Automated Workflows:</strong> Tools to automate data-driven tasks across blockchain networks and the broader web ecosystem.</li>
                </ul>
                <p>
                    We reserve the right to modify, suspend, or discontinue any aspect of our Services at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Services.
                </p>
            </section>

            <section>
                <h2 id="account">3. Account Registration</h2>
                <p>
                    To access certain features of our Services, you must create an account. When registering, you agree to:
                </p>
                <ul>
                    <li>Provide accurate, current, and complete information during registration</li>
                    <li>Maintain and promptly update your account information to keep it accurate and complete</li>
                    <li>Maintain the security and confidentiality of your login credentials</li>
                    <li>Accept responsibility for all activities that occur under your account</li>
                    <li>Notify us immediately of any unauthorized access or security breach</li>
                </ul>
                <p>
                    We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are being used for fraudulent, abusive, or illegal purposes.
                </p>
            </section>

            <section>
                <h2 id="payments">4. Subscription & Payments</h2>
                <p>
                    Certain features of our Services may require a paid subscription. By subscribing to a paid plan, you agree to:
                </p>
                <ul>
                    <li>Pay all applicable fees as described at the time of purchase</li>
                    <li>Provide valid payment information and authorize recurring charges</li>
                    <li>Accept that subscription fees are billed in advance on a recurring basis</li>
                </ul>
                <p>
                    <strong>Cryptocurrency Payments:</strong> We may accept payments in cryptocurrency. Such payments are subject to network confirmation times and applicable blockchain transaction fees. Exchange rate fluctuations are your responsibility.
                </p>
                <p>
                    <strong>Refund Policy:</strong> Subscription fees are generally non-refundable except as required by applicable law or as explicitly stated in our refund policy. Pro-rata refunds may be available for annual subscriptions cancelled within the first 14 days.
                </p>
            </section>

            <section>
                <h2 id="acceptable-use">5. Acceptable Use Policy</h2>
                <p>
                    You agree to use our Services only for lawful purposes and in accordance with these Terms. You shall not:
                </p>
                <ul>
                    <li>Use the Services to engage in any illegal activity, including money laundering, fraud, or market manipulation</li>
                    <li>Attempt to gain unauthorized access to our systems, other users' accounts, or connected blockchain networks</li>
                    <li>Use the Services to track, monitor, or surveil individuals without proper authorization</li>
                    <li>Interfere with or disrupt the integrity or performance of the Services</li>
                    <li>Upload or transmit viruses, malware, or other malicious code</li>
                    <li>Reverse engineer, decompile, or attempt to extract the source code of our software</li>
                    <li>Use automated means (bots, scrapers) to access the Services beyond API rate limits</li>
                    <li>Resell, sublicense, or redistribute our Services without written authorization</li>
                </ul>
            </section>

            <section>
                <h2 id="ip">6. Intellectual Property Rights</h2>
                <p>
                    The Services, including all content, features, functionality, software, and underlying technology, are owned by Sirath Network and are protected by international copyright, trademark, patent, and other intellectual property laws.
                </p>
                <p>
                    <strong>Our License to You:</strong> Subject to your compliance with these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Services for your internal business or personal purposes.
                </p>
                <p>
                    <strong>Your Content:</strong> You retain ownership of any data or content you submit to the Services. By submitting content, you grant us a worldwide, royalty-free license to use, process, and display such content solely to provide the Services to you.
                </p>
            </section>

            <section>
                <h2 id="ai-content">7. AI-Generated Content Disclaimer</h2>
                <p>
                    Our Services utilize artificial intelligence and machine learning technologies to analyze data and generate insights. You acknowledge and agree that:
                </p>
                <ul>
                    <li><strong>No Guarantee of Accuracy:</strong> AI-generated content may contain errors, inaccuracies, or outdated information. You should independently verify any critical information before making decisions.</li>
                    <li><strong>Not Financial Advice:</strong> Nothing in our Services constitutes financial, investment, legal, or tax advice. AI-generated insights are for informational purposes only.</li>
                    <li><strong>Evolving Technology:</strong> AI models are continuously updated and may produce different results over time for the same queries.</li>
                    <li><strong>Human Oversight:</strong> You are responsible for applying human judgment when acting on AI-generated recommendations.</li>
                </ul>
                <p className="font-medium italic">
                    Barzakh can make mistakes. Always double-check important information before taking action.
                </p>
            </section>

            <section>
                <h2 id="blockchain-disclaimer">8. Blockchain Data Disclaimer</h2>
                <p>
                    Our Services aggregate and analyze data from public blockchain networks. You acknowledge that:
                </p>
                <ul>
                    <li><strong>Data Accuracy:</strong> Blockchain data is sourced from third-party networks and may be subject to delays, errors, or inconsistencies beyond our control.</li>
                    <li><strong>No Endorsement:</strong> Display of wallet addresses, transactions, or token information does not constitute endorsement or verification of legitimacy.</li>
                    <li><strong>Chain Reorganizations:</strong> Blockchain networks may undergo reorganizations that could affect the accuracy of historical data.</li>
                    <li><strong>Smart Contract Risks:</strong> We do not audit or verify smart contracts. Interacting with smart contracts based on our data is at your own risk.</li>
                </ul>
            </section>

            <section>
                <h2 id="liability">9. Limitation of Liability</h2>
                <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SIRATH NETWORK AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR:
                </p>
                <ul>
                    <li>Any indirect, incidental, special, consequential, or punitive damages</li>
                    <li>Loss of profits, revenue, data, or business opportunities</li>
                    <li>Damages arising from your reliance on AI-generated content or blockchain data</li>
                    <li>Investment losses or financial decisions made based on our Services</li>
                    <li>Third-party actions or the conduct of other users</li>
                </ul>
                <p>
                    Our total liability for any claims arising from or related to your use of the Services shall not exceed the amount you paid us in the twelve (12) months preceding the claim, or $100 USD, whichever is greater.
                </p>
            </section>

            <section>
                <h2 id="indemnification">10. Indemnification</h2>
                <p>
                    You agree to indemnify, defend, and hold harmless Sirath Network and its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, costs, or expenses (including reasonable attorneys' fees) arising from:
                </p>
                <ul>
                    <li>Your use of the Services</li>
                    <li>Your violation of these Terms</li>
                    <li>Your violation of any applicable law or regulation</li>
                    <li>Your infringement of any third-party rights</li>
                    <li>Any content you submit to the Services</li>
                </ul>
            </section>

            <section>
                <h2 id="termination">11. Termination</h2>
                <p>
                    <strong>By You:</strong> You may terminate your account at any time by contacting us at support@sirath.network or using the account deletion feature in your settings.
                </p>
                <p>
                    <strong>By Us:</strong> We may suspend or terminate your access to the Services immediately, without prior notice, if we believe you have violated these Terms, engaged in fraudulent activity, or for any other reason at our sole discretion.
                </p>
                <p>
                    <strong>Effect of Termination:</strong> Upon termination, your right to use the Services will immediately cease. Provisions of these Terms that by their nature should survive termination shall survive, including intellectual property rights, disclaimers, and limitations of liability.
                </p>
            </section>

            <section>
                <h2 id="governing-law">12. Governing Law & Dispute Resolution</h2>
                <p>
                    These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Sirath Network is incorporated, without regard to its conflict of law provisions.
                </p>
                <p>
                    Any disputes arising from these Terms or your use of the Services shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules.
                </p>
                <p>
                    <strong>Class Action Waiver:</strong> You agree to resolve disputes with us on an individual basis and waive the right to participate in class action lawsuits or class-wide arbitration.
                </p>
            </section>

            <section>
                <h2 id="changes">13. Changes to These Terms</h2>
                <p>
                    We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of the Services after such modifications constitutes your acceptance of the updated Terms.
                </p>
                <p>
                    For significant changes, we may provide additional notice via email or in-app notifications. We encourage you to review these Terms periodically.
                </p>
            </section>

            <section>
                <h2 id="contact">14. Contact Us</h2>
                <p>
                    If you have any questions, concerns, or feedback about these Terms of Service, please contact us:
                </p>
                <ul>
                    <li><strong>Email:</strong> <a href="mailto:support@sirath.network" className="text-primary hover:text-primary/80 transition-colors no-underline font-medium">support@sirath.network</a></li>
                    <li><strong>Website:</strong> <a href="https://www.sirath.network/contact" className="text-primary hover:text-primary/80 transition-colors no-underline font-medium">sirath.network/contact</a></li>
                </ul>
                <p>
                    We aim to respond to all inquiries within 48 business hours.
                </p>
            </section>
        </LegalPageShell>
    );
}
