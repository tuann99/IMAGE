try:
    from Bio import SeqIO, Seq
    from Bio.Blast import NCBIWWW, NCBIXML
    import json
    import os
    import pandas as pd
    import requests
    import sys
    from xml.etree import ElementTree as ET
except ImportError as e:
    print(e)
    sys.exit(1)
# from multiprocessing import Pool
# import numpy as np
# import re

# Constants
INPUT = str(sys.argv[1])
TMP_DIR = os.path.join(os.path.dirname(__file__), "tmp")
DB_DIR = os.path.join(os.path.dirname(__file__), "db")
TMP_FILE_PATH = os.path.join(TMP_DIR, "tmp.fasta")
EC_DB_PATH = os.path.join(DB_DIR, "ec.tsv")
# KEEP_OR_REMOVE_TMP_FILES = str(sys.argv[2])
# VSEARCH_PATH = os.path.join(os.path.dirname(__file__), "vsearch\\vsearch.exe")

ACCESSION = []
EC_NUMBER = []

####################################################################################################
####################################################################################################
# data preprocessing
####################################################################################################
####################################################################################################

# def fasta_preprocessing_criteria(fasta_file_path):
#     """
#     Description:
#     Drops sequences that are more than two standard deviations
#     from the mean sequence length (Huse et al., 2007).
    
#     Args:
#     fasta_seq: The fasta sequence.
    
#     Returns:
#     The upper and lower bounds for keeping fasta sequences.
#     """
#     # Ideally don't want to write 2 diff files, but will figure out new method eventually
    
#     seq_len_list = []
    
#     with open(fasta_file_path, "r") as in_handle:
#         for record in SeqIO.parse(in_handle, "fasta"):
#             seq_len = len(record.seq)
#             seq_len_list.append(seq_len)
        
#     seq_len_list = np.array(seq_len_list)
#     mean = np.mean(seq_len_list)
#     std = np.std(seq_len_list)
#     upper_bound = mean + (2 * std)
#     lower_bound = mean - (2 * std)
    
#     return upper_bound, lower_bound

# def fasta_preprocessing(fasta_file_path):
#     """
#     Description:
#     Drops sequences that are more than two standard deviations
#     from the mean sequence length (Huse et al., 2007).

#     Args:
#     fasta_file_path: The path to the fasta file.

#     Returns:
#     The path to the new fasta file.
#     """

#     return

####################################################################################################
####################################################################################################
# Running blastx on the input sequence, parsing the xml files, and extracting the EC numbers
####################################################################################################
####################################################################################################

def create_tmp_fasta(text_input):
    """
    Description:
    Creates a temporary fasta file from the input text.
    Rather than working with files and directories from the user,
    this function creates a temporary file that is deleted after
    the program is finished. This is to avoid any issues with
    file permissions.
    
    Args:
    text_input: The input text from the user.
    
    Returns:
    The path to the temporary fasta file.
    """
    
    if os.path.exists(TMP_FILE_PATH):
        os.remove(TMP_FILE_PATH)
        
    try:       
        with open(TMP_FILE_PATH, "w") as out_handle:
            out_handle.write(text_input)
        return TMP_FILE_PATH
    except:
        print("Error writing to tmp.fasta")
        return None
    
def run_blastx_and_save_xml(fasta_file):
    """
    Description:
    Runs blastx on the fasta file and saves the results as XML files.
    
    Args:
    fasta_file: The path to the fasta file.
    
    Returns:
    Number of XML files created.
    """
    with open(fasta_file, "r") as in_handle:
        counter = 0
        for record in SeqIO.parse(in_handle, "fasta"):
            # translated_seq = Seq.translate(record.seq)
            counter += 1
            result_handle = NCBIWWW.qblast("blastx", "swissprot", record.seq, alignments=20, descriptions=20, hitlist_size=20)
            # result_handle = NCBIWWW.qblast("blastp", "swissprot", translated_seq, alignments=20, descriptions=20, hitlist_size=20)
            tmp_xml_path = os.path.join(TMP_DIR, f"tmp_rec_{counter}.xml")
            if os.path.exists(tmp_xml_path):
                os.remove(tmp_xml_path)
            with open(tmp_xml_path, "w") as out_handle:
                out_handle.write(result_handle.read())
                result_handle.close()
    return counter

# def multithreaded_run_blastx_and_save_xml(sequence):
#     result_handle = NCBIWWW.qblast("blastx", "swissprot", sequence, alignments=20, descriptions=20, hitlist_size=20)
#     with open("blastx_output.xml", "a") as out_handle:
#         out_handle.write(result_handle.read())

def create_accession_df(xml_file_count):
    """
    Description:
    Creates a dataframe from the XML files of the blast results.
    Iterates through tmp directory and parses each XML file.
    
    Args:
    Number of XML files created.
    
    Returns:
    A dataframe.
    """
    for i in range(1, xml_file_count + 1):
        tmp_xml_file = f"tmp_rec_{i}.xml"
        tmp_xml_path = os.path.join(TMP_DIR, tmp_xml_file)
        with open(tmp_xml_path) as result_handle:
            blast_records = NCBIXML.parse(result_handle)
            blast_records = list(blast_records)
            for blast_record in blast_records:
                for alignment in blast_record.alignments:
                    ACCESSION.append(alignment.title.split("|")[1].split(".")[0])
    df = pd.DataFrame({"accession": ACCESSION})
    return df

def get_ec_number(uniprot_accession):
    """
    Description:
    Get Enzyme Commission (EC) numbers from UniProt XML file.
    
    Args:
    Primary UniProt accession number.
    
    Returns:
    String for EC number.
    """
    
    url = f"https://www.uniprot.org/uniprot/{uniprot_accession}.xml"
    response = requests.get(url)
    root = ET.fromstring(response.content)

    for ecNumber in root.iter('{http://uniprot.org/uniprot}ecNumber'):
        formatted_ec_number = ecNumber.text.replace(".-", "")
        return formatted_ec_number
    
# def ec_number_count(ec_numbers_df):
#     """
#     Description:
#     Counts the number of times each EC number appears in the blast results.
    
#     Args:
#     Dataframe of ec numbers with column name "ec_number".
    
#     Returns:
#     Dictionaries for each position with unique numbers as keys and counts as values.
#     with EC number as key and count as value.
#     """
    
#     whole_ec_counts_dict = {}
#     final_ec_dict = {}
    
#     for ec in ec_numbers_df["ec_number"]:
#         if ec not in whole_ec_counts_dict:
#             whole_ec_counts_dict[ec] = 1
#         else:
#             whole_ec_counts_dict[ec] += 1
    
#     for key in whole_ec_counts_dict:
#         with open(EC_DB_PATH, "r") as in_handle:
#             for line in in_handle:
#                 if key == line.split("\t")[0]:
#                     ec_name = line.split("\t")[1].replace("\n", "")
#                     if ec_name not in final_ec_dict:
#                         final_ec_dict[ec_name] = str(whole_ec_counts_dict[key])
                        
#     return final_ec_dict

def ec_number_count(ec_numbers_df):
    """
    Description:
    Counts the number of times each EC number appears in the blast results.
    
    Args:
    Dataframe of ec numbers with column name "ec_number".
    
    Returns:
    Dictionaries for each position with unique numbers as keys and counts as values.
    with EC number as key and count as value.
    """
    
    whole_ec_counts_dict = {}
    final_ec_dict = {}
    ec_db_dict = {}

    # Read the EC_DB_PATH file once and store it in a dictionary
    with open(EC_DB_PATH, "r") as in_handle:
        for line in in_handle:
            key, ec_name = line.split("\t")
            ec_db_dict[key] = ec_name.replace("\n", "")

    for ec in ec_numbers_df["ec_number"]:
        if ec not in whole_ec_counts_dict:
            whole_ec_counts_dict[ec] = 1
        else:
            whole_ec_counts_dict[ec] += 1
    
    for key in whole_ec_counts_dict:
        if key in ec_db_dict:
            ec_name = ec_db_dict[key]
            if ec_name not in final_ec_dict:
                final_ec_dict[ec_name] = str(whole_ec_counts_dict[key])
                        
    return final_ec_dict

def clear_tmp_dir():
    """
    Description:
    Removes all files from the tmp directory.
    """
    for file in os.listdir(TMP_DIR):
        file_path = os.path.join(TMP_DIR, file)
        if os.path.exists(file_path):
            os.remove(file_path)
    return

def main():
    try:
        tmp_fasta = create_tmp_fasta(INPUT)
        
        if tmp_fasta is None:
            print("could not find tmp.fasta")
            return

        # with open(tmp_fasta, "r") as in_handle:
        #     sequences = [str(record.seq) for record in SeqIO.parse(in_handle, "fasta")]

        # with Pool(5) as p:
        #     p.map(multithreaded_run_blastx_and_save_xml, sequences)
        
        num_of_xml = run_blastx_and_save_xml(tmp_fasta)
        df = create_accession_df(num_of_xml)
        EC_NUMBER.extend(get_ec_number(accession) for accession in df["accession"])
        ec_num_df = pd.DataFrame({"ec_number": EC_NUMBER})
        final_ec_dict = ec_number_count(ec_num_df)
        print(json.dumps(final_ec_dict))
        sys.stderr.flush()
        sys.stdout.flush()
        # clear_tmp_dir()
        
        # if KEEP_OR_REMOVE_TMP_FILES == "remove":    
        #     clear_tmp_dir()
        # else:
        #     pass
        return
    except Exception as e:
        print(e)
        return

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"An error occurred: {e}")