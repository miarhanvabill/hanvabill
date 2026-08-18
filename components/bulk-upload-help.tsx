"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertCircle, FileText, Upload, Download } from "lucide-react"

export function BulkUploadHelp() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bulk Upload Guide
        </CardTitle>
        <CardDescription>Learn how to prepare and upload your CSV files for bulk data import</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preparation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="preparation">Preparation</TabsTrigger>
            <TabsTrigger value="formatting">Formatting</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          </TabsList>

          <TabsContent value="preparation" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Before You Start</h3>

              <Alert>
                <Download className="w-4 h-4" />
                <AlertDescription>
                  Always download the sample template first to ensure your data matches the required format.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Download Template</p>
                    <p className="text-sm text-gray-600">Get the correct CSV format with all required headers</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Prepare Your Data</p>
                    <p className="text-sm text-gray-600">
                      Organize your data in a spreadsheet application like Excel or Google Sheets
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Validate Data</p>
                    <p className="text-sm text-gray-600">
                      Ensure all required fields are filled and data formats are correct
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="formatting" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Data Formatting Rules</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600">✓ Do This</h4>
                  <ul className="text-sm space-y-2">
                    <li>• Use the exact header names from the template</li>
                    <li>• Keep the first row as headers</li>
                    <li>• Use consistent date format (YYYY-MM-DD)</li>
                    <li>• Include country code for phone numbers</li>
                    <li>• Use decimal format for prices (e.g., 45.00)</li>
                    <li>• Save file as CSV format</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-red-600">✗ Avoid This</h4>
                  <ul className="text-sm space-y-2">
                    <li>• Don't modify header names</li>
                    <li>• Don't leave required fields empty</li>
                    <li>• Don't use different date formats</li>
                    <li>• Don't include special characters in IDs</li>
                    <li>• Don't exceed maximum field lengths</li>
                    <li>• Don't save as Excel (.xlsx) format</li>
                  </ul>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Field Requirements:</strong>
                  <div className="mt-2 space-y-1">
                    <div>
                      <Badge variant="destructive" className="text-xs mr-2">
                        Required
                      </Badge>{" "}
                      Must be filled for every record
                    </div>
                    <div>
                      <Badge variant="secondary" className="text-xs mr-2">
                        Optional
                      </Badge>{" "}
                      Can be left empty if not available
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Upload Process</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Select Upload Type</p>
                    <p className="text-sm text-gray-600">Choose whether to upload customers, services, or bookings</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Choose Your File</p>
                    <p className="text-sm text-gray-600">Drag and drop your CSV file or click to browse</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Review and Upload</p>
                    <p className="text-sm text-gray-600">Check file details and click upload to start processing</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Monitor Progress</p>
                    <p className="text-sm text-gray-600">Watch the progress bar and wait for completion confirmation</p>
                  </div>
                </div>
              </div>

              <Alert>
                <Upload className="w-4 h-4" />
                <AlertDescription>
                  <strong>Upload Limits:</strong> Maximum file size is 10MB. Large files may take longer to process.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>

          <TabsContent value="troubleshooting" className="space-y-4">
            <div className="space-y-4">
              <h3 className="font-medium">Common Issues & Solutions</h3>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">❌ "Invalid File Type" Error</h4>
                  <p className="text-sm text-gray-600 mb-2">Your file is not in CSV format.</p>
                  <p className="text-sm">
                    <strong>Solution:</strong> Save your file as CSV (.csv) format, not Excel (.xlsx) or other formats.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">❌ "Missing Required Headers" Error</h4>
                  <p className="text-sm text-gray-600 mb-2">Your CSV is missing required column headers.</p>
                  <p className="text-sm">
                    <strong>Solution:</strong> Download the template and ensure all required headers are present and
                    spelled correctly.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-red-600 mb-2">❌ "Invalid Data Format" Error</h4>
                  <p className="text-sm text-gray-600 mb-2">Some data doesn't match the expected format.</p>
                  <p className="text-sm">
                    <strong>Solution:</strong> Check date formats (YYYY-MM-DD), phone numbers (+1234567890), and email
                    addresses.
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-orange-600 mb-2">⚠️ "Duplicate Records" Warning</h4>
                  <p className="text-sm text-gray-600 mb-2">Some records already exist in the system.</p>
                  <p className="text-sm">
                    <strong>Solution:</strong> Duplicate records are automatically skipped. Check the upload summary for
                    details.
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Still having issues?</strong> Check that your data matches the sample template exactly,
                  including header names and data formats.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
