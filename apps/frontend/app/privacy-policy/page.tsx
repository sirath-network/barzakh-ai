import { LegalPageShell } from "@/components/legal-page-shell";

const PRIVACY_TOC = [
    { title: "1. Introduction", id: "introduction" },
    { title: "2. Information We Collect", id: "info-collect" },
    { title: "3. How We Use Your Information", id: "how-use" },
    { title: "4. Blockchain & On-Chain Data", id: "blockchain-data" },
    { title: "5. AI Processing & Analytics", id: "ai-processing" },
    { title: "6. Information Sharing", id: "sharing" },
    { title: "7. Data Security", id: "security" },
    { title: "8. Data Retention", id: "retention" },
    { title: "9. Your Rights & Choices", id: "rights" },
    { title: "10. Cookies & Tracking", id: "cookies" },
    { title: "11. International Transfers", id: "international" },
    { title: "12. Children's Privacy", id: "children" },
    { title: "13. Changes to Policy", id: "changes" },
    { title: "14. Contact Us", id: "contact" },
];

export default function PrivacyPage() {
    return (
        <LegalPageShell title="Privacy Policy" lastUpdated="11 Dec 2025" toc={PRIVACY_TOC}>
            <section>
                <h2 id="introduction">1. Introduction</h2>
                <p>
                    Sirath Network ("Company," "we," "us," or "our") operates Barzakh, an AI-powered blockchain intelligence platform. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our website, applications, and services (collectively, the "Services").
                </p>
                <p>
                    We are committed to protecting your privacy and handling your data responsibly. By accessing or using our Services, you consent to the data practices described in this Privacy Policy. If you do not agree with our practices, please do not use our Services.
                </p>
            </section>

            <section>
                <h2 id="info-collect">2. Information We Collect</h2>
                <p>We collect various types of information to provide and improve our Services:</p>

                <div className="pl-4 border-l-2 border-primary/20 bg-muted/30 p-4 rounded-r-lg my-6">
                    <h3 className="text-lg font-medium text-foreground mt-0">2.1 Information You Provide</h3>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, password, and profile details when you create an account</li>
                        <li><strong>Payment Information:</strong> Billing address and payment method details (processed by secure third-party payment processors)</li>
                        <li><strong>Wallet Addresses:</strong> Blockchain wallet addresses you choose to track or monitor through our Services</li>
                        <li><strong>Communications:</strong> Messages, feedback, and support requests you send to us</li>
                        <li><strong>Search Queries:</strong> Your searches and queries within our platform to personalize your experience</li>
                    </ul>
                </div>

                <div className="pl-4 border-l-2 border-primary/20 bg-muted/30 p-4 rounded-r-lg my-6">
                    <h3 className="text-lg font-medium text-foreground mt-0">2.2 Information Collected Automatically</h3>
                    <ul>
                        <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers, and hardware model</li>
                        <li><strong>Usage Data:</strong> Pages visited, features used, time spent on pages, click patterns, and navigation paths</li>
                        <li><strong>Log Data:</strong> Server logs including access times, error reports, and referring URLs</li>
                        <li><strong>Location Data:</strong> General geographic location based on IP address (we do not collect precise GPS location)</li>
                    </ul>
                </div>

                <div className="pl-4 border-l-2 border-primary/20 bg-muted/30 p-4 rounded-r-lg my-6">
                    <h3 className="text-lg font-medium text-foreground mt-0">2.3 Information from Third Parties</h3>
                    <ul>
                        <li><strong>Authentication Providers:</strong> If you sign in via Google, GitHub, or other OAuth providers, we receive basic profile information</li>
                        <li><strong>Blockchain Networks:</strong> Public on-chain data associated with wallet addresses you choose to monitor</li>
                        <li><strong>Analytics Partners:</strong> Aggregated usage statistics from analytics services</li>
                    </ul>
                </div>
            </section>

            <section>
                <h2 id="how-use">3. How We Use Your Information</h2>
                <p>We use the information we collect for the following purposes:</p>
                <ul>
                    <li><strong>Service Delivery:</strong> To provide, maintain, and improve our blockchain intelligence Services</li>
                    <li><strong>Personalization:</strong> To customize your experience, including personalized AI insights and recommendations</li>
                    <li><strong>Communication:</strong> To send service-related notifications, updates, security alerts, and support messages</li>
                    <li><strong>Analytics:</strong> To analyze usage patterns, diagnose technical issues, and optimize performance</li>
                    <li><strong>Security:</strong> To detect, prevent, and respond to fraud, abuse, and security threats</li>
                    <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes</li>
                    <li><strong>Marketing:</strong> To send promotional communications (with your consent, where required)</li>
                    <li><strong>Research:</strong> To conduct research and development to improve our AI models and Services</li>
                </ul>
            </section>

            <section>
                <h2 id="blockchain-data">4. Blockchain & On-Chain Data</h2>
                <p>
                    Our Services analyze publicly available blockchain data. It's important to understand how we handle this data:
                </p>
                <ul>
                    <li><strong>Public Nature:</strong> Blockchain transactions are inherently public. We do not collect private keys or control any blockchain networks.</li>
                    <li><strong>Wallet Monitoring:</strong> When you add wallet addresses for monitoring, we retrieve and analyze publicly available transaction data associated with those addresses.</li>
                    <li><strong>No Attribution:</strong> We do not attempt to identify or deanonymize blockchain users beyond the information you explicitly provide.</li>
                    <li><strong>Data Aggregation:</strong> We may aggregate blockchain data for research and market analysis purposes, always in a non-personally identifiable manner.</li>
                </ul>
                <p className="font-medium italic">
                    Note: Your use of blockchain networks is subject to those networks' protocols and any associated privacy implications inherent to public ledgers.
                </p>
            </section>

            <section>
                <h2 id="ai-processing">5. AI Processing & Analytics</h2>
                <p>
                    Our platform uses artificial intelligence and machine learning to provide insights and automate workflows. Here's how we handle AI processing:
                </p>
                <ul>
                    <li><strong>Query Processing:</strong> Your search queries and prompts are processed by our AI systems to generate relevant responses and insights.</li>
                    <li><strong>Model Training:</strong> We may use aggregated, anonymized usage data to improve our AI models. Your personal data is not used to train models without explicit consent.</li>
                    <li><strong>Conversation History:</strong> Chat history is stored to provide context for ongoing conversations and improve response quality.</li>
                    <li><strong>Opt-Out:</strong> You may request deletion of your conversation history at any time through your account settings or by contacting us.</li>
                </ul>
                <p>
                    We implement technical safeguards to prevent AI systems from exposing sensitive personal information in their outputs.
                </p>
            </section>

            <section>
                <h2 id="sharing">6. Information Sharing & Disclosure</h2>
                <p>
                    We do not sell your personal information to third parties. We may share information in the following circumstances:
                </p>
                <ul>
                    <li><strong>Service Providers:</strong> With trusted vendors who help us operate our Services (hosting, payment processing, analytics), subject to confidentiality obligations</li>
                    <li><strong>Legal Requirements:</strong> When required by law, subpoena, court order, or government request</li>
                    <li><strong>Safety & Security:</strong> To protect the rights, safety, and security of our users, our Company, and the public</li>
                    <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, bankruptcy, or sale of assets, where your data may be transferred to the successor entity</li>
                    <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information with third parties</li>
                </ul>
                <p>
                    We require all third parties to maintain the confidentiality and security of your data and to use it only for the purposes for which it was disclosed.
                </p>
            </section>

            <section>
                <h2 id="security">7. Data Security</h2>
                <p>
                    We implement robust security measures to protect your information:
                </p>
                <ul>
                    <li><strong>Encryption:</strong> Data is encrypted in transit (TLS/SSL) and at rest using industry-standard encryption protocols</li>
                    <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms limit data access to authorized personnel</li>
                    <li><strong>Infrastructure Security:</strong> Our systems are hosted on secure cloud infrastructure with regular security audits</li>
                    <li><strong>Monitoring:</strong> Continuous monitoring for suspicious activity and potential security threats</li>
                    <li><strong>Incident Response:</strong> Documented procedures for responding to and reporting security incidents</li>
                </ul>
                <p>
                    While we strive to protect your data, no method of transmission over the internet is 100% secure. You are responsible for maintaining the security of your account credentials.
                </p>
            </section>

            <section>
                <h2 id="retention">8. Data Retention</h2>
                <p>
                    We retain your personal information for as long as necessary to:
                </p>
                <ul>
                    <li>Provide you with our Services and maintain your account</li>
                    <li>Comply with legal obligations and resolve disputes</li>
                    <li>Enforce our Terms of Service and policies</li>
                    <li>Improve our Services through aggregated analytics</li>
                </ul>
                <p>
                    After account deletion, we may retain anonymized or aggregated data that cannot be used to identify you. Backup copies may be retained for a limited period for disaster recovery purposes.
                </p>
            </section>

            <section>
                <h2 id="rights">9. Your Rights & Choices</h2>
                <p>
                    Depending on your location, you may have the following rights regarding your personal data:
                </p>
                <ul>
                    <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
                    <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal retention requirements)</li>
                    <li><strong>Portability:</strong> Request a machine-readable copy of your data to transfer to another service</li>
                    <li><strong>Opt-Out:</strong> Unsubscribe from marketing communications at any time</li>
                    <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
                    <li><strong>Objection:</strong> Object to processing based on legitimate interests</li>
                </ul>
                <p>
                    To exercise these rights, please contact us at <a href="mailto:support@barzakh.tech" className="text-primary hover:text-primary/80 transition-colors no-underline font-medium">support@barzakh.tech</a>. We will respond to requests within 30 days.
                </p>
            </section>

            <section>
                <h2 id="cookies">10. Cookies & Tracking Technologies</h2>
                <p>
                    We use cookies and similar technologies to enhance your experience:
                </p>
                <ul>
                    <li><strong>Essential Cookies:</strong> Required for core functionality like authentication and security</li>
                    <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our Services</li>
                    <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                    <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (only with your consent)</li>
                </ul>
                <p>
                    You can manage cookie preferences through your browser settings or our cookie consent banner. Disabling certain cookies may affect functionality.
                </p>
            </section>

            <section>
                <h2 id="international">11. International Data Transfers</h2>
                <p>
                    Your information may be transferred to and processed in countries other than your country of residence. When we transfer data internationally, we implement appropriate safeguards:
                </p>
                <ul>
                    <li>Standard Contractual Clauses approved by relevant authorities</li>
                    <li>Data processing agreements with adequate security commitments</li>
                    <li>Compliance with applicable data protection frameworks</li>
                </ul>
                <p>
                    By using our Services, you consent to the transfer of your information to countries that may have different data protection laws than your jurisdiction.
                </p>
            </section>

            <section>
                <h2 id="children">12. Children's Privacy</h2>
                <p>
                    Our Services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a child without parental consent, we will take steps to delete such information promptly.
                </p>
                <p>
                    If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                </p>
            </section>

            <section>
                <h2 id="changes">13. Changes to This Privacy Policy</h2>
                <p>
                    We may update this Privacy Policy periodically to reflect changes in our practices, technology, or legal requirements. When we make material changes:
                </p>
                <ul>
                    <li>We will update the "Last Updated" date at the top of this page</li>
                    <li>We may notify you via email or in-app notification</li>
                    <li>For significant changes, we may provide additional notice or seek your consent</li>
                </ul>
                <p>
                    Your continued use of our Services after such modifications constitutes your acceptance of the updated Privacy Policy. We encourage you to review this policy periodically.
                </p>
            </section>

            <section>
                <h2 id="contact">14. Contact Us</h2>
                <p>
                    If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                </p>
                <ul>
                    <li><strong>Email:</strong> <a href="mailto:support@barzakh.tech" className="text-primary hover:text-primary/80 transition-colors no-underline font-medium">support@barzakh.tech</a></li>
                    <li><strong>Website:</strong> <a href="https://sirath.network/contact" className="text-primary hover:text-primary/80 transition-colors no-underline font-medium">sirath.network/contact</a></li>
                </ul>
                <p>
                    For privacy-related inquiries, please include "Privacy Request" in your subject line. We aim to respond to all inquiries within 30 days.
                </p>
            </section>
        </LegalPageShell>
    );
}
