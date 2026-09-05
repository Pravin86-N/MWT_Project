import { Report } from '../types/report';
import { fetchReports, createReport, updateReport, deleteReport } from '../lib/api';

export const getReports = async (): Promise<Report[]> => {
    try {
        const reports = await fetchReports();
        return reports;
    } catch (error) {
        console.error('Error fetching reports:', error);
        throw error;
    }
};

export const addReport = async (reportData: Omit<Report, 'id'>): Promise<Report> => {
    try {
        const newReport = await createReport(reportData);
        return newReport;
    } catch (error) {
        console.error('Error creating report:', error);
        throw error;
    }
};

export const editReport = async (reportId: string, reportData: Partial<Report>): Promise<Report> => {
    try {
        const updatedReport = await updateReport(reportId, reportData);
        return updatedReport;
    } catch (error) {
        console.error('Error updating report:', error);
        throw error;
    }
};

export const removeReport = async (reportId: string): Promise<void> => {
    try {
        await deleteReport(reportId);
    } catch (error) {
        console.error('Error deleting report:', error);
        throw error;
    }
};